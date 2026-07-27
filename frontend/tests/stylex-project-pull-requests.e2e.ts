import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project pull request list owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-pull-requests.stylex.ts", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const responsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const lessResponsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const lessPage = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiUI = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const template = readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8");
  const twoColumn = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );
  const twoColumnTemplate = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  expect(template).toContain('class="post-list-wrap"');
  expect(template).toContain('class="avatar-wrap mlarge"');
  expect(bootstrap).toContain(".row-fluid .span2 {");
  expect(bootstrap).toContain("width: 14.893617021276595%;");
  expect(bootstrap).toContain(".row-fluid .span10 {");
  expect(bootstrap).toContain("width: 82.97872340425532%;");
  expect(responsive).toContain('.row-fluid [class*="span"] {');
  expect(lessResponsive).toContain(".hide-in-mobile");
  expect(lessResponsive).toContain(".span-hard-wrap");
  expect(lessPage).toContain(".issue-option");
  expect(lessPage).toContain("select {\n          width: 100%;");
  expect(yobiUI).toContain(".search-bar");
  expect(yobiUI).toContain("&.full {\n            width: 100%;");
  expect(route).not.toContain("pullrequeset-tab-menu");
  for (const selector of [
    ".pullrequeset-tab-menu > li > button {",
    ".pullrequeset-tab-menu > li > button:hover,",
    ".pullrequeset-tab-menu > li.active > button,",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".nav-tabs > li > a:hover,");
  expect(appCss).toContain(".nav-tabs > li.active > a,");
  expect(route).toContain('data-stylex-owner="project-pullrequests-tabs"');
  expect(route).toContain("searchColumnHidden");
  expect(route).not.toContain('style={leftMenuHiddenByTwoColumnMode ? { display: "none" }');
  expect(theme).toContain('searchColumnHidden: { display: "none" }');
  expect(theme).toContain('width: "14.893617021276595%"');
  expect(theme).toContain('width: "82.97872340425532%"');
  expect(theme).toContain('contributorsSelect: { width: "100%" }');
  expect(theme).toMatch(/searchInput: \{[\s\S]*?width: "100%"/u);
  expect(route).toContain('data-stylex-owner="project-pullrequests-contributors-select"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-content-column"');
  expect(twoColumn).toContain('$(".left-menu").hide(0)');
  expect(twoColumnTemplate).toContain('id="two-column-mode-checkbox"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-two-column-popover"');
  expect(route).not.toContain('style={{ display: "block", left: "-75px", top: "-74px" }}');
  expect(theme).toContain('twoColumnPopover: { display: "block", left: "-75px", top: "-74px" }');
  expect(theme).toContain("export const pullRequestColors");
  await mockPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/pullRequests`);
    await expect(owner(page, "project-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "project-pullrequests-list")).toBeVisible();
    await expect(owner(page, "project-pullrequests-rows")).toContainText(
      "Parity profile pull request",
    );
    await expect(owner(page, "project-pullrequests-search-input")).toHaveAttribute(
      "name",
      "filter",
    );
    const geometry = await owner(page, "project-pullrequests-content").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const columns = await page.evaluate(() => {
      const search = document.querySelector(
        '[data-stylex-owner="project-pullrequests-search-column"]',
      );
      const content = document.querySelector(
        '[data-stylex-owner="project-pullrequests-content-column"]',
      );
      const list = document.querySelector('[data-stylex-owner="project-pullrequests-rows"]');
      const row = document.querySelector('[data-stylex-owner="project-pullrequests-row"]');
      const contributors = document.querySelector(
        '[data-stylex-owner="project-pullrequests-contributors-select"]',
      );
      if (!search || !content || !list || !row || !contributors) return null;
      const searchBox = search.getBoundingClientRect();
      const contentBox = content.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const contributorsBox = contributors.getBoundingClientRect();
      return {
        search: {
          left: searchBox.left,
          width: searchBox.width,
          clientWidth: search.clientWidth,
          scrollWidth: search.scrollWidth,
          right: searchBox.right,
          display: getComputedStyle(search).display,
        },
        content: { left: contentBox.left, width: contentBox.width },
        list: { left: listBox.left },
        row: { left: rowBox.left },
        contributors: {
          clientWidth: contributors.clientWidth,
          scrollWidth: contributors.scrollWidth,
          right: contributorsBox.right,
          width: getComputedStyle(contributors).width,
        },
      };
    });
    expect(columns).not.toBeNull();
    if (viewport.width === 1366) {
      expect(columns!.search.width).toBeCloseTo(200.4, 0);
      expect(columns!.content.left).toBeCloseTo(columns!.list.left, 0);
      expect(columns!.list.left).toBeCloseTo(columns!.row.left, 0);
      expect(columns!.content.left).toBeGreaterThan(columns!.search.left);
      expect(columns!.content.left - columns!.search.left).toBeGreaterThan(200);
      expect(columns!.contributors.clientWidth).toBeLessThanOrEqual(columns!.search.clientWidth);
      expect(columns!.contributors.scrollWidth).toBeLessThanOrEqual(columns!.search.clientWidth);
      expect(columns!.contributors.right).toBeLessThanOrEqual(columns!.search.right + 1);
      expect(columns!.search.scrollWidth).toBeLessThanOrEqual(columns!.search.clientWidth);
    } else {
      expect(columns!.search.display).toBe("none");
    }
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);

    if (viewport.width === 1366) {
      const toggle = page.locator("#two-column-mode-checkbox");
      await toggle.hover();
      const popover = owner(page, "project-pullrequests-two-column-popover");
      await expect(popover).toBeVisible();
      await expect(popover).toHaveCSS("display", "block");
      await expect(popover).toHaveCSS("left", "-75px");
      await expect(popover).toHaveCSS("top", "-74px");
      expect(await popover.getAttribute("style")).toBeNull();
    }
  }
});

async function mockPullRequests(page: Page) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
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
        items: [
          {
            closedCommentThreadCount: 0,
            commentThreadCount: 0,
            conflict: false,
            contributorLabel: "Site Admin",
            contributorLoginId: "admin",
            createdLabel: "Today",
            fromBranch: "feature/parity",
            fromOwnerName: "weblabs",
            fromProjectName: "demo",
            id: 1,
            ownerName: "weblabs",
            projectName: "demo",
            pullRequestNumber: 1,
            receiverLabel: "Site Admin",
            receiverLoginId: "admin",
            reviewerCount: 0,
            reviewerNames: [],
            state: "open",
            title: "Parity profile pull request",
            toBranch: "main",
            updatedLabel: "Today",
          },
        ],
        openCount: 1,
        closedCount: 0,
        sentCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 1,
      },
    }),
  );
}
