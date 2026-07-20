import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();
const closedRoute = readFileSync(
  "src/routes/organizations/$organizationName/closedPullrequests.tsx",
  "utf8",
);

test.use({ locale: "ko-KR" });

test("records organization pull request list owners and responsive containment", async ({
  page,
}) => {
  const route = readFileSync("src/routes/organizations/$organizationName/pullrequests.tsx", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const theme = readFileSync(
    "src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list.scala.html",
    "utf8",
  );
  expect(template).toContain("pullrequeset-tab-menu");
  expect(template).toContain('name="filter"');
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
  expect(route).toContain('data-stylex-owner="organization-pullrequests-tabs"');
  expect(route).toContain('data-stylex-owner="organization-pullrequests-search-input"');
  expect(closedRoute).toContain('category="closed"');
  for (const owner of [
    "organization-pullrequests-list",
    "organization-pullrequests-empty",
    "organization-pullrequests-pagination",
    "organization-pullrequests-row",
    "organization-pullrequests-row-meta",
    "organization-pullrequests-row-progress",
    "organization-pullrequests-row-progress-fill",
    "organization-pullrequests-row-state",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(theme).toContain("export const organizationPullRequestColors");
  await mockPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/pullrequests`);
    await expect(owner(page, "organization-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-list")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-empty")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-search-input")).toHaveAttribute(
      "name",
      "filter",
    );
    const geometry = await owner(page, "organization-pullrequests-content").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);

    await page.goto(`${basePath}/organizations/weblabs/closedPullrequests`);
    await expect(owner(page, "organization-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-empty")).toBeVisible();
    await expect(page).toHaveURL(/\/organizations\/weblabs\/closedPullrequests(?:\?.*)?$/);
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
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], openCount: 0, closedCount: 0, pageNum: 1, pageSize: 20, totalCount: 0 },
    }),
  );
}
