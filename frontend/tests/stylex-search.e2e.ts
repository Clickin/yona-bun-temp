import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records global search owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/search.tsx", "utf8");
  const theme = readFileSync("src/routes/-search.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/search/result.scala.html", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  expect(template).toContain("partial_search");
  expect(partial).toContain('class="page-wrap-outer"');
  expect(partial).toContain('class="project-page-wrap"');
  expect(partial).toContain("search-category-wrap");
  expect(partial).toContain('id="searchInnerForm"');
  expect(partial).toContain('class="span11"');
  expect(route).toContain('data-stylex-owner="global-search-input"');
  expect(route).toContain('data-stylex-owner="global-search-result-wrap"');
  expect(route).toContain('className="project-page-wrap"');
  expect(theme).toContain('minHeight: "450px"');
  expect(theme).toContain('boxSizing: "border-box"');
  expect(theme).toContain("searchColors");
  await mockSearch(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/search?keyword=bug&searchType=issue`);
    await expect(owner(page, "global-search-input")).toHaveValue("bug");
    await expect(owner(page, "global-search-result-wrap")).toBeVisible();
    const geometry = await owner(page, "global-search-page").evaluate((element) => {
      const projectPageWrap = element.querySelector<HTMLElement>(".project-page-wrap");
      const pageRect = element.getBoundingClientRect();
      const projectRect = projectPageWrap?.getBoundingClientRect();
      return {
        pageLeft: pageRect.left,
        pageRight: pageRect.right,
        pageScrollWidth: element.scrollWidth,
        projectLeft: projectRect?.left ?? null,
        projectRight: projectRect?.right ?? null,
        projectScrollWidth: projectPageWrap?.scrollWidth ?? null,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width + 16);
    expect(geometry.pageLeft).toBe(0);
    expect(geometry.pageRight).toBe(viewport.width);
    expect(geometry.pageScrollWidth).toBe(viewport.width);
    expect(geometry.projectLeft).toBe(0);
    expect(geometry.projectRight).toBe(viewport.width);
    expect(geometry.projectScrollWidth).toBe(viewport.width);
  }
});

async function mockSearch(page: Page) {
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
  await page.route("**/api/v1/search**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        keyword: "bug",
        searchType: "issue",
        counts: {
          issues: 1,
          users: 0,
          projects: 0,
          posts: 0,
          milestones: 0,
          issueComments: 0,
          postComments: 0,
          reviews: 0,
        },
        items: [
          {
            id: "1",
            href: "/yona/weblabs/demo/issue/1",
            type: "issue",
            title: "Bug issue",
            projectName: "demo",
            ownerName: "weblabs",
            authorLabel: "admin",
            authorLoginId: "admin",
            createdLabel: "today",
            updatedLabel: "today",
            number: "1",
            state: "open",
            snippets: [{ text: "Bug issue", highlights: [] }],
          },
        ],
        totalCount: 1,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        context: { organizationName: "", ownerName: "", projectName: "" },
      },
    }),
  );
}
