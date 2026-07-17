import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records organization issue search and tabs owners", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/organizations/$organizationName/-organization-issues.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/group_issue_list.scala.html",
    "utf8",
  );
  expect(template).toContain("group_issue_search_partial");
  expect(route).toContain('data-stylex-owner="organization-issues-search-input"');
  expect(route).toContain('data-stylex-owner="organization-issues-tabs"');
  for (const owner of [
    "organization-issues-items",
    "organization-issues-empty",
    "organization-issues-pagination",
    "organization-issues-row",
    "organization-issues-row-meta",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(theme).toContain("organizationIssuesTheme");
  await mockIssues(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/issues`);
    await expect(owner(page, "organization-issues-tabs")).toBeVisible();
    await expect(owner(page, "organization-issues-empty")).toBeVisible();
    await expect(owner(page, "organization-issues-search-input")).toHaveAttribute("name", "filter");
    const geometry = await owner(page, "organization-issues-wrap").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: "1",
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
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        items: [],
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        openIssueCount: 0,
        closedIssueCount: 0,
        visibleProjects: [],
        filter: "",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: [],
      },
    }),
  );
}
