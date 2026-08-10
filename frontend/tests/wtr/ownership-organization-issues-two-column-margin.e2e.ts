// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-organization-issues-two-column-margin",
);

test.use({ locale: "en-US" });

test("organization issues owns legacy mr10 on the two-column mode control", async ({ page }) => {
  const routeSource = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacyRoot = readFileSync(
    "../yona-original/app/views/organization/group_issue_list.scala.html",
    "utf8",
  );
  const legacyPartial = readFileSync(
    "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
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

  expect(legacyRoot).toContain("group_issue_search_partial");
  expect(legacyRoot).toContain("javascripts/service/yona.twoColumnMode.js");
  expect(legacyPartial).toContain('<form id="search"');
  expect(legacyPartial).toContain('<ul class="nav nav-tabs nm">');
  expect(legacyPartial).toContain("<li>@common.twoColumnModeCheckboxArea()</li>");
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
  expect(bootstrap).toContain(".nav-tabs");
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
    "common.two.column.view",
    "common.two.column.mode.desc",
  ]) {
    expect(messages).toContain(`${messageKey} =`);
  }

  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");

  expect(twoColumnJs).toContain("$twoColumnMode.on('click'");

  expect(routeSource).toContain('data-owner="organization-issues-two-column-anchor"');
  expect(routeSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(routeSource).toContain('id="two-column-mode-checkbox"');
  expect(routeSource).toContain('id="two-column-mode"');
  expect(routeSource).not.toContain('data-toggle="popover"');
  expect(routeSource).not.toContain('data-trigger="hover"');

  await mockOrganizationIssues(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/organizations/weblabs/issues`, { waitUntil: "commit" });
    await expect(page.locator('[data-owner="organization-issues-tabs"]')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
    await page.reload({ waitUntil: "commit" });

    const tabs = page.locator('[data-owner="organization-issues-tabs"]');
    const stateTabs = tabs.locator(":scope > li");
    const mode = page.locator('[data-owner="organization-issues-two-column-anchor"]');
    const label = mode.locator("label");
    const border = mode.locator(".two-column-icon-border");
    const text = mode.locator(".two-column-mode-text");
    const toggle = mode.locator("#two-column-mode");
    const popover = mode.locator('[role="tooltip"]');

    await expect(tabs).toBeVisible();
    await expect(stateTabs).toHaveCount(3);
    await expect(stateTabs.nth(0)).toContainText("Open");
    await expect(stateTabs.nth(1)).toContainText("Closed");
    await expect(stateTabs.nth(2)).toContainText("Column View");
    await expect(mode).toHaveCount(1);
    await expect(mode).toHaveClass(/two-column-icon/u);
    await expect(mode).toHaveClass(/mr10/u);
    await expect(mode).toHaveClass(/hide-in-mobile/u);
    await expect(mode).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(toggle).toHaveAttribute("id", "two-column-mode");
    await expect(mode).toHaveAttribute("title", "Two Column Mode");
    await expect(text).toHaveText("Column View");
    await expect(mode).toHaveCSS("margin-right", "10px");
    await expect(mode).toHaveCSS("position", "relative");
    await expect(mode).not.toHaveAttribute("style");
    await expect(label).not.toHaveCSS("margin-right", "10px");
    await expect(border).not.toHaveCSS("margin-right", "10px");
    await expect(text).not.toHaveCSS("margin-right", "10px");
    await expect(stateTabs.nth(0)).not.toHaveCSS("margin-right", "10px");
    await expect(stateTabs.nth(1)).not.toHaveCSS("margin-right", "10px");

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

    const order = await tabs.evaluate((element) =>
      Array.from(element.children).map((child) => child.textContent?.trim() ?? ""),
    );
    expect(order[0]).toContain("Open");
    expect(order[1]).toContain("Closed");
    expect(order[2]).toContain("Column View");

    const layout = await page.evaluate(() => {
      const tabsElement = document.querySelector<HTMLElement>(
        '[data-owner="organization-issues-tabs"]',
      );
      const modeElement = document.querySelector<HTMLElement>(
        '[data-owner="organization-issues-two-column-anchor"]',
      );
      const searchElement = document.querySelector<HTMLElement>(
        '[data-owner="organization-issues-search"]',
      );
      const resultsElement = document.querySelector<HTMLElement>(
        '[data-owner="organization-issues-results"]',
      );
      if (!tabsElement || !modeElement || !searchElement || !resultsElement) return null;
      const tabsBox = tabsElement.getBoundingClientRect();
      const modeBox = modeElement.getBoundingClientRect();
      const searchBox = searchElement.getBoundingClientRect();
      const resultsBox = resultsElement.getBoundingClientRect();
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
        results: { left: resultsBox.left, right: resultsBox.right },
        search: { left: searchBox.left, right: searchBox.right },
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
    expect(layout!.search.left).toBeGreaterThanOrEqual(0);
    expect(layout!.search.right).toBeLessThanOrEqual(layout!.innerWidth + 1);
    expect(layout!.results.left).toBeGreaterThanOrEqual(0);
    expect(layout!.results.right).toBeLessThanOrEqual(layout!.innerWidth + 1);

    if (viewport.width > 767) {
      expect(layout!.mode.display).not.toBe("none");
      expect(layout!.mode.left).toBeGreaterThanOrEqual(layout!.tabs.left - 1);
      expect(layout!.mode.right).toBeLessThanOrEqual(layout!.tabs.right + 1);
      expect(layout!.mode.top).toBeGreaterThanOrEqual(layout!.tabs.top - 1);
      expect(layout!.mode.bottom).toBeLessThanOrEqual(layout!.tabs.bottom + 1);
      await expect(mode).toBeVisible();
      await mode.hover();
      await expect(popover).toBeVisible({ timeout: 1000 });
      await expect(popover).toHaveCSS("position", "absolute");
      await expect(popover).toHaveCSS("margin-bottom", "5px");
      // `bottom: 100%` / `left: 50%` resolve to used px against the anchor
      // (F7-A twoColumnPopover: bottom 100% + left 50% + translateX(-50%));
      // assert the contract: popover sits above the anchor, horizontally centered.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const pop = document.querySelector(
              '[data-owner="organization-issues-two-column-popover"]',
            );
            const anchor = document.querySelector(
              '[data-owner="organization-issues-two-column-anchor"]',
            );
            if (!pop || !anchor) return null;
            const pb = pop.getBoundingClientRect();
            const ab = anchor.getBoundingClientRect();
            return {
              above: pb.bottom <= ab.top + 1,
              centered: Math.abs(pb.left + pb.width / 2 - (ab.left + ab.width / 2)) < 2,
            };
          }),
        )
        .toEqual({ above: true, centered: true });
      await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
      await expect(popover.locator(".popover-content")).toContainText(
        "Splits list and body into columns respectively",
      );
      await toggle.focus();
      await expect(popover).toBeVisible({ timeout: 1000 });
      await page.keyboard.press("Space");
      await expect(toggle).toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("true");
      await page.reload({ waitUntil: "commit" });
      const reloadedToggle = page.locator("#two-column-mode");
      await expect(reloadedToggle).toBeChecked();
      await reloadedToggle.focus();
      await page.keyboard.press("Space");
      await expect(reloadedToggle).not.toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("false");
      await page.mouse.move(1, 1);
      await expect(
        page.locator('[data-owner="organization-issues-two-column-popover"]'),
      ).toBeHidden({
        timeout: 1000,
      });
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

async function mockOrganizationIssues(page: Page) {
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
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
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
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: true,
        visibleProjects: [{ ownerName: "weblabs", projectName: "sample" }],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 1,
        filter: "",
        items: [
          {
            assigneeLabel: "",
            assigneeLoginId: "",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            childClosedCount: 0,
            childIssues: [],
            childOpenCount: 0,
            commentCount: 1,
            createdLabel: "Jul 24, 2026",
            id: 10,
            issueNumber: 10,
            labels: [],
            ownerName: "weblabs",
            projectName: "sample",
            state: "open",
            title: "Organization issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        projectNames: [],
        totalCount: 1,
        totalPages: 1,
        visibleProjects: [{ ownerName: "weblabs", projectName: "sample" }],
      },
    }),
  );
}
