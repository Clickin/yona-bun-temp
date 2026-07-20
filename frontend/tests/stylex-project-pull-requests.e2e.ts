import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project pull request list owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-pull-requests.stylex.ts", "utf8");
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
    await expect(owner(page, "project-pullrequests-search-input")).toHaveAttribute(
      "name",
      "filter",
    );
    const geometry = await owner(page, "project-pullrequests-content").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
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
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        openCount: 0,
        closedCount: 0,
        sentCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
      },
    }),
  );
}
