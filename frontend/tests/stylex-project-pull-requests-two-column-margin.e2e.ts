import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-pull-requests-two-column-margin",
);

test.use({ locale: "en-US" });

test("project pull requests owns legacy mr10 on the two-column mode control", async ({ page }) => {
  const routeSource = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");
  const styleSource = readFileSync(
    "src/routes/$ownerName/$projectName/-pull-requests.stylex.ts",
    "utf8",
  );
  const legacyRoot = readFileSync("../yona-original/app/views/git/list.scala.html", "utf8");
  const legacyPartial = readFileSync(
    "../yona-original/app/views/git/partial_search.scala.html",
    "utf8",
  );
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
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
  const twoColumnJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyRoot).toContain("git.partial_search");
  expect(legacyRoot).toContain("javascripts/service/yona.twoColumnMode.js");
  expect(legacyPartial).toContain('<ul class="nav nav-tabs nm pullrequeset-tab-menu">');
  expect(legacyPartial).toContain("@common.twoColumnModeCheckboxArea()");
  expect(legacyTwoColumn).toContain(
    '<div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox"',
  );
  expect(legacyTwoColumn).toContain("title='@Messages(\"common.two.column.mode\")'");
  expect(legacyTwoColumn).toContain("data-content='@Messages(\"common.two.column.mode.desc\")'");
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacyTwoColumn).toContain('class="two-column-icon-border"');
  expect(legacyTwoColumn).toContain('class="two-column-mode-text"');
  expect(commonLess).toMatch(/\.mr10\s*\{\s*margin-right:10px;\s*\}/u);
  expect(pageLess).toContain(".two-column-icon, .show-subtasks");
  expect(pageLess).toContain("line-height: 37px;");
  expect(pageLess).toContain("margin-left: 10px;");
  expect(responsiveLess).toContain(".hide-in-mobile");
  expect(responsiveLess).toContain("display: none !important;");
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
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");
  expect(twoColumnJs).toContain('trigger: "hover"');
  expect(twoColumnJs).toContain("delay: { show: 100, hide: 100 }");
  expect(twoColumnJs).toContain("$twoColumnMode.on('click'");
  expect(styleSource).toContain('twoColumnAnchor: { marginRight: "10px", position: "relative" }');
  expect(routeSource).toContain('data-stylex-owner="project-pullrequests-two-column-anchor"');
  expect(routeSource).toContain("twoColumnAnchorStyleProps");
  expect(routeSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(routeSource).toContain('id="two-column-mode-checkbox"');
  expect(routeSource).toContain('id="two-column-mode"');
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');
  expect(routeSource).not.toContain("style={{");

  await mockPullRequests(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/weblabs/demo/pullRequests`, { waitUntil: "commit" });
    await expect(page.locator('[data-stylex-owner="project-pullrequests-tabs"]')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
    await page.reload({ waitUntil: "commit" });

    const tabs = page.locator('[data-stylex-owner="project-pullrequests-tabs"]');
    const mode = page.locator('[data-stylex-owner="project-pullrequests-two-column-anchor"]');
    const toggle = mode.locator("#two-column-mode");
    await expect(mode).toHaveCount(1);
    await expect(mode).toHaveClass(/two-column-icon/u);
    await expect(mode).toHaveClass(/mr10/u);
    await expect(mode).toHaveClass(/hide-in-mobile/u);
    await expect(mode).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(toggle).toHaveAttribute("id", "two-column-mode");
    await expect(mode).toHaveAttribute("title", "Two Column Mode");
    await expect(mode).toHaveCSS("margin-right", "10px");
    await expect(mode).toHaveCSS("position", "relative");
    await expect(mode).not.toHaveAttribute("style");

    const pluginAttributes = await mode.evaluate((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) =>
          /^(?:data-(?:toggle|placement|action|href|url|dismiss|target|trigger|backdrop|spy|provider|loading-text|content)|data-request-[\w-]+)$/u.test(
            name,
          ),
        ),
    );
    expect(pluginAttributes).toEqual([]);

    const layout = await page.evaluate(() => {
      const tabsElement = document.querySelector<HTMLElement>(
        '[data-stylex-owner="project-pullrequests-tabs"]',
      );
      const modeElement = document.querySelector<HTMLElement>(
        '[data-stylex-owner="project-pullrequests-two-column-anchor"]',
      );
      if (!tabsElement || !modeElement) return null;
      const tabsBox = tabsElement.getBoundingClientRect();
      const modeBox = modeElement.getBoundingClientRect();
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
        tabs: {
          bottom: tabsBox.bottom,
          left: tabsBox.left,
          right: tabsBox.right,
          top: tabsBox.top,
        },
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.innerWidth + 1);

    if (viewport.width > 767) {
      expect(layout!.mode.display).not.toBe("none");
      expect(layout!.mode.left).toBeGreaterThanOrEqual(layout!.tabs.left - 1);
      expect(layout!.mode.right).toBeLessThanOrEqual(layout!.tabs.right + 1);
      expect(layout!.mode.top).toBeGreaterThanOrEqual(layout!.tabs.top - 1);
      expect(layout!.mode.bottom).toBeLessThanOrEqual(layout!.tabs.bottom + 1);
      await expect(mode).toBeVisible();
      await mode.hover();
      await expect(mode.locator('[role="tooltip"]')).toBeVisible({ timeout: 1000 });
    } else {
      expect(layout!.mode.display).toBe("none");
      expect(layout!.mode.width).toBe(0);
      expect(layout!.mode.height).toBe(0);
      await expect(mode).toBeHidden();
      await expect(toggle).not.toBeChecked();
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        acceptedCount: 0,
        category: "open",
        closedCount: 0,
        contributors: [],
        currentUserId: 0,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 0,
      },
    }),
  );
}
