import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project search Style owners preserve populated and empty result contracts", async () => {
  const [route, _style, legacy, issues, users, posts, less, appCss, fallbackCss] =
    await Promise.all([
      readFile(
        new URL("../src/routes/$ownerName/$projectName/search.tsx", import.meta.url),
        "utf8",
      ),
      Promise.resolve(curatedAppCss()),
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
      Promise.resolve(curatedAppCss()),
      Promise.resolve(mergedLegacyBlock()),
    ]);
  expect(legacy).toContain("search-category-wrap");
  expect(issues).toContain("search-list-wrap");
  expect(users).toContain("search-list-item");
  expect(posts).toContain("empty-result");
  expect(less).toContain(".search-box-wrap");
  expect(less).toContain(".search-category-wrap");
  expect(less).toContain(".search-list-wrap");
  expect(less).toContain(".empty-result {");
  for (const declaration of [
    "padding:0 20px;",
    "margin: 20px 0;",
    "text-align: center;",
    "min-height: 250px;",
    'background-image:url("@{base-image-path}/no_contents.jpg");',
    "background-repeat: no-repeat;",
    "background-position: center 50%;",
  ]) {
    expect(less).toContain(declaration);
  }
  expect(appCss).not.toMatch(/(?:^|\n)\.empty-result\s*\{/u);
  for (const retiredSelector of [
    ".search-box-wrap {",
    ".search-result-title {",
    ".search-list-wrap {",
    ".search-content-body {",
    ".search-meta-info {",
  ]) {
    expect(appCss).not.toMatch(
      new RegExp(`(?:^|\\n)${retiredSelector.replace(/[{]/u, "\\{")}`, "u"),
    );
  }
  for (const declaration of [
    ".empty-result {",
    "padding: 0 20px;",
    "margin: 20px 0;",
    "text-align: center;",
    "min-height: 250px;",
    'background-image: url("./assets/legacy/images/no_contents.jpg");',
    "background-repeat: no-repeat;",
    "background-position: center 50%;",
  ]) {
    expect(fallbackCss).toContain(declaration);
  }
  for (const owner of [
    "project-search-category-item",
    "project-search-box",
    "project-search-result-title",
    "project-search-list",
    "project-search-result-item",
    "project-search-empty-result",
    "project-search-input",
    "project-search-avatar",
    "project-search-title",
    "project-search-content",
    "project-search-meta",
    "project-search-keyword",
  ])
    expect(route).toContain(`data-owner="${owner}"`);
  for (const owner of [
    "project-search-page-grid-row",
    "project-search-page-grid-category-column",
    "project-search-page-grid-results-column",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
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
    const categoryItems = page.locator('[data-owner="project-search-category-item"]');
    await expect(categoryItems).toHaveCount(7);
    await expect(categoryItems.first()).toBeVisible();
    await expect(page.locator('[data-owner="project-search-result-item"]')).toBeVisible();
    const grid = await page.evaluate(() => {
      const row = document.querySelector('[data-owner="project-search-page-grid-row"]');
      const category = document.querySelector(
        '[data-owner="project-search-page-grid-category-column"]',
      );
      const results = document.querySelector(
        '[data-owner="project-search-page-grid-results-column"]',
      );
      if (!row || !category || !results) return null;
      const rowBox = row.getBoundingClientRect();
      const categoryBox = category.getBoundingClientRect();
      const resultsBox = results.getBoundingClientRect();
      return {
        row: { left: rowBox.left, right: rowBox.right, width: rowBox.width },
        category: { left: categoryBox.left, right: categoryBox.right, width: categoryBox.width },
        results: { left: resultsBox.left, right: resultsBox.right, width: resultsBox.width },
        viewportWidth: window.innerWidth,
      };
    });
    expect(grid).not.toBeNull();
    expect(grid!.row.width).toBeGreaterThan(0);
    expect(grid!.category.left).toBeGreaterThanOrEqual(grid!.row.left);
    expect(grid!.results.right).toBeLessThanOrEqual(grid!.viewportWidth + 1);
    if (viewport.width <= 767) {
      expect(grid!.results.left).toBeGreaterThanOrEqual(grid!.row.left);
      expect(grid!.category.width).toBeCloseTo(grid!.row.width, 0);
      expect(grid!.results.width).toBeCloseTo(grid!.row.width, 0);
      expect(grid!.results.left).toBeCloseTo(grid!.row.left, 0);
    } else {
      expect(grid!.results.left).toBeGreaterThanOrEqual(grid!.category.right - 1);
      expect(grid!.category.width / grid!.row.width).toBeCloseTo(0.14893617, 2);
      expect(grid!.results.width / grid!.row.width).toBeCloseTo(0.82978723, 2);
    }
    await expect(page.locator('[data-owner="project-search-result-item"] a.title')).toHaveAttribute(
      "href",
      /issue\/42/,
    );
    await expect(page.locator('[data-owner="project-search-input"]')).toHaveCSS(
      "margin-bottom",
      "0px",
    );
    await expect(page.locator('[data-owner="project-search-title"]')).toHaveCSS(
      "line-height",
      "30px",
    );
    await expect(page.locator('[data-owner="project-search-content"]')).toHaveCSS(
      "padding-left",
      "20px",
    );
    await expect(page.locator('[data-owner="project-search-meta"]')).toHaveCSS("font-size", "13px");
    await expect(page.locator('[data-owner="project-search-keyword"]')).toHaveCSS(
      "background-color",
      "rgb(107, 196, 233)",
    );
    const bounds = await page
      .locator('[data-owner="project-search-results"]')
      .evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          width: box.width,
          viewportWidth: window.innerWidth,
        };
      });
    expect(bounds.width).toBeGreaterThan(0);
    // The shared Bootstrap span grid can retain page-level mobile overflow;
    // keep this assertion scoped to the Style-owned results box.
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  }
  await page.goto(`${basePath}/weblabs/demo/search?keyword=bug&searchType=issue`);
  await page.locator('[data-owner="project-search-result-item"] a.title').click();
  await expect(page).toHaveURL(/\/weblabs\/demo\/issue\/42$/u);

  await page.goto(`${basePath}/weblabs/demo/search?keyword=member&searchType=user`);
  const avatar = page.locator('[data-owner="project-search-avatar"]');
  await expect(avatar).toHaveCSS("width", "40px");
  await expect(avatar).toHaveCSS("height", "40px");
  await expect(avatar).toHaveAttribute("href", `${basePath}/alice`);
  await expect(avatar.locator("img")).toHaveCSS("vertical-align", "top");
  await page.unroute("**/api/v1/projects/**/**/search?**");
  await page.route("**/api/v1/projects/**/**/search?**", (route) =>
    route.fulfill({ contentType: "application/json", json: emptyResponse() }),
  );
  await page.goto(`${basePath}/weblabs/demo/search?keyword=none&searchType=issue`);
  const emptyResult = page.locator('[data-owner="project-search-empty-result"]');
  await expect(emptyResult).toBeVisible();
  await expect(emptyResult).toHaveCSS(
    "background-image",
    new RegExp(`${basePath}/legacy-assets/images/no_contents\\.jpg`),
  );
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
  await page.route("**/api/v1/owners/**/projects/**/container**", (route) =>
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
  await page.route("**/api/v1/projects/**/**/search?**", (route) => {
    const searchType = new URL(route.request().url()).searchParams.get("searchType");
    return route.fulfill({
      contentType: "application/json",
      json: searchType === "user" ? populatedUserResponse() : populatedResponse(),
    });
  });
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

function populatedUserResponse() {
  return {
    ...emptyResponse(),
    keyword: "member",
    searchType: "user",
    requestedSearchType: "user",
    counts: { ...emptyResponse().counts, users: 1 },
    items: [
      {
        id: "7",
        type: "user",
        title: "Alice",
        href: "/yona/alice",
        number: "",
        snippets: [],
        authorLabel: "Alice",
        authorLoginId: "alice",
        avatarUrl: "/yona/files/7",
        createdLabel: "Jun 30, 2026",
        updatedLabel: "",
        state: "active",
        ownerName: "",
        projectName: "",
      },
    ],
    totalCount: 1,
  };
}
