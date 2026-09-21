import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization issue quick search keeps legacy list ownership", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");

  const legacy = readFileSync(
    "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
    "utf8",
  );
  expect(legacy).toContain("group_issue_list_quicksearch");
  expect(route).toContain('data-owner="organization-issues-quick-search"');

  await mockOrganizationIssues(page);
  await page.goto(`${basePath}/organizations/weblabs/issues`);
  const quickSearch = page.locator('[data-owner="organization-issues-quick-search"]');
  await expect(quickSearch).toBeVisible();
  await expect(quickSearch).toHaveClass(/lst-stacked/);
  await expect(quickSearch.locator("li")).toHaveCount(4);
  await expect(quickSearch.locator("li").first()).toHaveClass(/active/);
  await expect(quickSearch).toHaveCSS("list-style-type", "none");
  const geometry = await quickSearch.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: window.innerWidth };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
});

async function mockOrganizationIssues(page: Page) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
