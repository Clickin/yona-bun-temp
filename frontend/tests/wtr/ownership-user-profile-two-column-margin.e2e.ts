import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-user-profile-two-column-margin");

test.use({ locale: "en-US" });

test("public user profile owns legacy spacing on both mode controls", async ({ page }) => {
  const routeSource = readFileSync("src/routes/$user.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");

  const styleSource = readFileSync("src/app.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  const twoColumnJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );
  const showSubtasksJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.showSubtask.js",
    "utf8",
  );
  const userViewJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.user.View.js",
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

  expect(legacyView).toContain("@common.twoColumnModeCheckboxArea()");
  expect(legacyView).toContain("@common.showSubtasksCheckbox()");
  expect(legacyView).toContain("javascripts/service/yona.twoColumnMode.js");
  expect(legacyView).toContain("javascripts/service/yona.showSubtask.js");
  expect(legacyTwoColumn).toContain('class="two-column-icon mr10 hide-in-mobile"');
  expect(legacyTwoColumn).toContain('id="two-column-mode-checkbox"');
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacyTwoColumn).toContain('class="two-column-icon-border"');
  expect(legacyTwoColumn).toContain('class="two-column-mode-text"');
  expect(legacySubtasks).toContain('class="show-subtasks mr10"');
  expect(legacySubtasks).toContain('id="two-column-mode-checkbox"');
  expect(legacySubtasks).toContain('id="toggle-show-subtasks"');
  expect(legacySubtasks).toContain('class="show-subtasks-button-border"');
  expect(legacySubtasks).toContain('class="show-subtasks-text"');
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain("line-height: 37px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(responsiveLess).toContain(".hide-in-mobile");
  expect(responsiveLess).toContain("display: none !important;");
  expect(bootstrap).toContain(".nav-tabs > li > a");
  expect(bootstrap).toContain('.checkbox input[type="checkbox"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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
  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");
  expect(twoColumnJs).toContain("localStorage.setItem('useTwoColumnMode'");

  expect(showSubtasksJs).toContain("localStorage.getItem('showSubtasksAlways')");
  expect(showSubtasksJs).toContain("localStorage.setItem('showSubtasksAlways'");
  expect(userViewJs).toContain("_initShowChildList");
  expect(userViewJs).toContain("_initTwoColumnMode");

  expect(routeSource).not.toContain("two-column-icon mr10 hide-in-mobile");
  // 667398a04 legacy-parity restore: the show-subtasks anchor retains the legacy class.
  expect(routeSource).toContain("show-subtasks mr10");
  expect(routeSource).toContain('anchorOwner="user-profile-two-column-popover-anchor"');
  expect(sharedComponentSource).toContain("data-owner={anchorOwner}");
  expect(routeSource).toContain('data-owner="user-profile-show-subtasks-popover-anchor"');
  expect(routeSource).toContain('localStorage?.setItem("showSubtasksAlways"');
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');
  expect(routeSource).not.toContain('data-placement="top"');

  await mockUserProfile(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin`, { waitUntil: "commit" });
    await expect(page.locator('[data-owner="user-profile-tabs"]')).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem("useTwoColumnMode");
      localStorage.removeItem("showSubtasksAlways");
    });
    await page.reload({ waitUntil: "commit" });

    const mode = page.locator('[data-owner="user-profile-two-column-popover-anchor"]');
    const subtasks = page.locator('[data-owner="user-profile-show-subtasks-popover-anchor"]');
    const modeToggle = mode.locator("#two-column-mode");
    const subtasksToggle = subtasks.locator("#toggle-show-subtasks");
    for (const [control, id] of [
      [mode, "two-column-mode-checkbox"],
      [subtasks, "two-column-mode-checkbox"],
    ] as const) {
      await expect(control).toHaveCount(1);
      await expect(control).toHaveAttribute("id", id);
      await expect(control).toHaveCSS("margin-left", "10px");
      await expect(control).toHaveCSS("margin-right", "10px");
      await expect(control).toHaveCSS("position", "relative");
      await expect(control).not.toHaveAttribute("style");
      await expect(control.locator("label")).toHaveCount(1);
    }
    await expect(mode.locator(".two-column-icon-border")).toContainText("Column View");
    await expect(subtasks.locator(".show-subtasks-button-border")).toContainText("Show subtask");
    await expect(modeToggle).toHaveAttribute("id", "two-column-mode");
    await expect(subtasksToggle).toHaveAttribute("id", "toggle-show-subtasks");
    expect(await mode.getAttribute("data-toggle")).toBeNull();
    expect(await subtasks.getAttribute("data-toggle")).toBeNull();

    const layout = await page.evaluate(() => {
      const stream = document.querySelector<HTMLElement>('[data-owner="user-profile-stream"]');
      const modeElement = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-two-column-popover-anchor"]',
      );
      const subtasksElement = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-show-subtasks-popover-anchor"]',
      );
      if (!stream || !modeElement || !subtasksElement) return null;
      const streamBox = stream.getBoundingClientRect();
      const modeBox = modeElement.getBoundingClientRect();
      const subtasksBox = subtasksElement.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        mode: {
          bottom: modeBox.bottom,
          display: getComputedStyle(modeElement).display,
          height: modeBox.height,
          left: modeBox.left,
          right: modeBox.right,
          top: modeBox.top,
          width: modeBox.width,
        },
        stream: { left: streamBox.left, right: streamBox.right },
        subtasks: {
          bottom: subtasksBox.bottom,
          display: getComputedStyle(subtasksElement).display,
          left: subtasksBox.left,
          right: subtasksBox.right,
          top: subtasksBox.top,
        },
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.innerWidth + 1);
    expect(layout!.subtasks.left).toBeGreaterThanOrEqual(layout!.stream.left - 1);
    expect(layout!.subtasks.right).toBeLessThanOrEqual(layout!.stream.right + 1);

    if (viewport.width > 767) {
      expect(layout!.mode.left).toBeGreaterThanOrEqual(layout!.stream.left - 1);
      expect(layout!.mode.right).toBeLessThanOrEqual(layout!.stream.right + 1);
      await expect(mode).toBeVisible();
      await mode.hover();
      await expect(mode.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
      await modeToggle.focus();
      await expect(mode.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
    } else {
      expect(layout!.mode.display).toBe("none");
      expect(layout!.mode.width).toBe(0);
      expect(layout!.mode.height).toBe(0);
      await expect(mode).toBeHidden();
    }

    await expect(subtasks).toBeVisible();
    await subtasks.hover();
    await expect(subtasks.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
    await subtasksToggle.focus();
    await expect(subtasks.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });

    if (viewport.width > 767) {
      await modeToggle.check();
      await expect(modeToggle).toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("true");
      await modeToggle.uncheck();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("false");
    }

    const childList = page.locator(".child-issue-list").first();
    await expect(childList).toHaveClass(/hide/u);
    await subtasksToggle.check();
    await expect(subtasksToggle).toBeChecked();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
      .toBe("true");
    await expect(childList).not.toHaveClass(/hide/u);
    await expect(childList.getByText("Profile child issue")).toBeVisible();
    await subtasksToggle.uncheck();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
      .toBe("false");
    await expect(childList).toHaveClass(/hide/u);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockUserProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          loginId: "admin",
          displayName: "Admin",
          englishName: "Admin",
          avatarUrl: "",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
          isGuest: false,
          isBlocked: false,
          isSiteAdmin: false,
          connectedSocialProviders: [],
        },
        issueItems: [
          {
            id: 1,
            number: 1,
            issueNumber: 1,
            title: "Profile issue",
            state: "open",
            ownerName: "admin",
            projectName: "sample",
            authorLoginId: "admin",
            authorLabel: "Admin",
            updatedLabel: "today",
            childIssues: [
              {
                issueNumber: 2,
                title: "Profile child issue",
                state: "open",
                createdLabel: "today",
                assigneeLabel: "",
                labels: [],
              },
            ],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
