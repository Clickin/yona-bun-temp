import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project search StyleX owners preserve populated and empty result contracts", async () => {
  const [route, style, legacy, issues, users, posts, less] = await Promise.all([
    readFile(new URL("../src/routes/$ownerName/$projectName/search.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/routes/$ownerName/$projectName/-project-search.stylex.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/partial_search.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/partial_issues.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/partial_users.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/partial_posts.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
  ]);
  expect(legacy).toContain("search-category-wrap");
  expect(issues).toContain("search-list-wrap");
  expect(users).toContain("search-list-item");
  expect(posts).toContain("empty-result");
  expect(less).toContain(".search-box-wrap");
  expect(less).toContain(".search-category-wrap");
  expect(less).toContain(".search-list-wrap");
  for (const owner of [
    "project-search-category-item",
    "project-search-box",
    "project-search-result-title",
    "project-search-list",
    "project-search-list-item",
    "project-search-empty-result",
  ])
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(style).toContain("searchBox: {");
  expect(style).toContain("searchCategory: {");
  expect(style).toContain("searchResultTitle: {");
  expect(style).toContain("searchListItem: {");
  expect(style).toContain("emptyResult: {");
});

test("project search populated and empty states keep responsive bounds and links", async ({
  page,
}) => {
  await mockProjectSearch(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/search?keyword=bug&searchType=issue`);
    const categoryItems = page.locator('[data-stylex-owner="project-search-category-item"]');
    await expect(categoryItems).toHaveCount(7);
    await expect(categoryItems.first()).toBeVisible();
    await expect(page.locator('[data-stylex-owner="project-search-list-item"]')).toBeVisible();
    await expect(
      page.locator('[data-stylex-owner="project-search-list-item"] a.title'),
    ).toHaveAttribute("href", /issue\/42/);
    const bounds = await page
      .locator('[data-stylex-owner="project-search-results"]')
      .evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        scrollWidth: document.documentElement.scrollWidth,
      }));
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.scrollWidth).toBe(viewport.width);
  }
  await page.unroute("**/api/v1/owners/**/projects/**/search?**");
  await page.route("**/api/v1/owners/**/projects/**/search?**", (route) =>
    route.fulfill({ contentType: "application/json", json: emptyResponse() }),
  );
  await page.goto(`${basePath}/weblabs/demo/search?keyword=none&searchType=issue`);
  await expect(page.locator('[data-stylex-owner="project-search-empty-result"]')).toBeVisible();
});

async function mockProjectSearch(page: Page) {
  await page.addInitScript(() => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: "/yona",
      supportedLanguages: ["ko-KR"],
    };
  });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        name: "demo",
        vcs: "GIT",
        menuSetting: {
          code: true,
          issue: true,
          pullRequest: true,
          review: true,
          milestone: true,
          board: true,
        },
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/search?**", (route) =>
    route.fulfill({ contentType: "application/json", json: populatedResponse() }),
  );
}

function emptyResponse() {
  return {
    context: { organizationName: "", ownerName: "weblabs", projectName: "demo" },
    counts: {
      issues: 0,
      users: 0,
      projects: 0,
      posts: 0,
      milestones: 0,
      issueComments: 0,
      postComments: 0,
      reviews: 0,
    },
    items: [],
    keyword: "none",
    pageNum: 1,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "project",
    searchType: "issue",
    totalCount: 0,
  };
}
function populatedResponse() {
  return {
    ...emptyResponse(),
    keyword: "bug",
    counts: { ...emptyResponse().counts, issues: 1 },
    items: [
      {
        id: "42",
        type: "issue",
        title: "Save button fails",
        href: "/weblabs/demo/issue/42",
        number: "42",
        snippets: [{ text: "Bug body", highlights: [] }],
        authorLabel: "Alice",
        authorLoginId: "alice",
        createdLabel: "Jun 30, 2026",
        updatedLabel: "",
        state: "OPEN",
        ownerName: "weblabs",
        projectName: "demo",
      },
    ],
    totalCount: 1,
  };
}
