import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-issues-two-column-margin");

test.use({ locale: "en-US" });

test("project issues owns legacy mr10 on both mode-control wrappers", async ({ page }) => {
  const routeSource = readFileSync("src/routes/$ownerName/$projectName/issues.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyRoot = readFileSync(
    "../yona-original/app/views/issue/partial_list_wrap.scala.html",
    "utf8",
  );
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyRoot).toContain('<ul class="nav nav-tabs nm">');
  expect(legacyRoot).toContain("<li>@common.twoColumnModeCheckboxArea()</li>");
  expect(legacyRoot).toContain('<li class="show-subtasks-li">@common.showSubtasksCheckbox()</li>');
  expect(legacyTwoColumn).toContain('class="two-column-icon mr10 hide-in-mobile"');
  expect(legacyTwoColumn).toContain('id="two-column-mode-checkbox"');
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacySubtasks).toContain('class="show-subtasks mr10"');
  expect(legacySubtasks).toContain('id="toggle-show-subtasks"');
  expect(commonLess).toContain(".mr10 { margin-right:10px; }");
  expect(pageLess).toContain(".show-subtasks-li");
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain("line-height: 37px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(bootstrap).toContain(".nav-tabs");
  expect(bootstrap).toContain('.checkbox input[type="checkbox"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain(".row-fluid");
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
    "common.two.column.mode",
    "common.two.column.mode.desc",
    "common.two.column.view",
    "common.show.subtasks",
    "common.show.subtasks.desc",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(routeSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(routeSource).toContain("show-subtasks mr10");
  expect(routeSource).toContain('data-owner="project-issues-two-column-anchor"');
  expect(routeSource).toContain('data-owner="project-issues-subtasks-anchor"');
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');

  await mockProjectIssues(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.addInitScript(() => {
      localStorage.removeItem("useTwoColumnMode");
      localStorage.removeItem("showSubtasksAlways");
    });
    await page.goto(`${basePath}/admin/sample/issues`);

    const tabs = page.locator("#span10 > .nav.nav-tabs");
    const stateTabs = tabs.locator(":scope > li");
    const twoColumn = page.locator('[data-owner="project-issues-two-column-anchor"]');
    const subtasks = page.locator('[data-owner="project-issues-subtasks-anchor"]');

    await expect(tabs).toBeVisible();
    await expect(stateTabs).toHaveCount(4);
    await expect(twoColumn).toHaveCount(1);
    await expect(subtasks).toHaveCount(1);
    await expect(twoColumn).toHaveClass(/two-column-icon/);
    await expect(twoColumn).toHaveClass(/mr10/);
    await expect(twoColumn).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(subtasks).toHaveClass(/show-subtasks/);
    await expect(subtasks).toHaveClass(/mr10/);
    await expect(subtasks).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(twoColumn).toHaveCSS("margin-right", "10px");
    await expect(subtasks).toHaveCSS("margin-right", "10px");
    await expect(stateTabs.nth(0)).toHaveCSS("margin-right", "0px");
    await expect(stateTabs.nth(1)).toHaveCSS("margin-right", "0px");
    await expect(stateTabs.nth(0)).toContainText("Open");
    await expect(stateTabs.nth(1)).toContainText("Closed");
    await expect(stateTabs.nth(2)).toContainText("Column View");
    await expect(stateTabs.nth(3)).toContainText("Show subtask");
    await expect(twoColumn).not.toHaveAttribute("data-content");
    await expect(subtasks).not.toHaveAttribute("data-toggle");
    await expect(subtasks).not.toHaveAttribute("data-trigger");

    const layout = await page.evaluate(() => {
      const tabsElement = document.querySelector<HTMLElement>("#span10 > .nav.nav-tabs");
      const twoColumnElement = document.querySelector<HTMLElement>(
        '[data-owner="project-issues-two-column-anchor"]',
      );
      const subtasksElement = document.querySelector<HTMLElement>(
        '[data-owner="project-issues-subtasks-anchor"]',
      );
      if (!tabsElement || !twoColumnElement || !subtasksElement) return null;
      const tabsBox = tabsElement.getBoundingClientRect();
      const twoColumnBox = twoColumnElement.getBoundingClientRect();
      const subtasksBox = subtasksElement.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        tabs: {
          bottom: tabsBox.bottom,
          left: tabsBox.left,
          right: tabsBox.right,
          top: tabsBox.top,
        },
        twoColumn: {
          bottom: twoColumnBox.bottom,
          display: getComputedStyle(twoColumnElement).display,
          left: twoColumnBox.left,
          right: twoColumnBox.right,
          top: twoColumnBox.top,
        },
        subtasks: {
          bottom: subtasksBox.bottom,
          left: subtasksBox.left,
          right: subtasksBox.right,
          top: subtasksBox.top,
        },
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.innerWidth + 1);
    expect(layout!.subtasks.top).toBeGreaterThanOrEqual(layout!.tabs.top);
    expect(layout!.subtasks.bottom).toBeLessThanOrEqual(layout!.tabs.bottom + 1);
    expect(layout!.subtasks.right).toBeLessThanOrEqual(layout!.tabs.right + 1);
    if (viewport.width > 767) {
      expect(layout!.twoColumn.display).not.toBe("none");
      expect(layout!.twoColumn.top).toBeGreaterThanOrEqual(layout!.tabs.top);
      expect(layout!.twoColumn.bottom).toBeLessThanOrEqual(layout!.tabs.bottom + 1);
      await expect(twoColumn).toBeVisible();
      await expect(subtasks).toBeVisible();

      await twoColumn.hover();
      await expect(twoColumn.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await twoColumn.locator("#two-column-mode").check();
      await expect(twoColumn.locator("#two-column-mode")).toBeChecked();
      await subtasks.hover();
      await expect(subtasks.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await subtasks.locator("#toggle-show-subtasks").check();
      await expect(subtasks.locator("#toggle-show-subtasks")).toBeChecked();
      await expect(page.locator('[data-owner="project-issues-child-list"]')).toHaveCSS(
        "display",
        "block",
      );
    } else {
      expect(layout!.twoColumn.display).toBe("none");
      await expect(twoColumn).toBeHidden();
      await expect(subtasks).toBeVisible();
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      siteName: "Yoram",
      supportedLanguages: ["en"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 1,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [], total: 0 } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/issue-search-users**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        draftItems: [],
        items: [
          {
            authorLabel: "Admin",
            authorLoginId: "admin",
            childClosedCount: 0,
            childIssues: [
              {
                assigneeLabel: "",
                authorLoginId: "admin",
                commentCount: 0,
                createdLabel: "2026-07-24",
                id: 11,
                issueNumber: 11,
                labels: [],
                state: "open",
                title: "Child issue",
                voterCount: 0,
              },
            ],
            childOpenCount: 1,
            commentCount: 0,
            createdLabel: "2026-07-24",
            id: 10,
            issueNumber: 10,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Parent issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
}
