import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

test("project search category wrapper owns the legacy category geometry contract", async () => {
  const [route, style, partial, pageLess] = await Promise.all([
    readFile(new URL("../src/routes/$ownerName/$projectName/search.tsx", import.meta.url), "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(
      new URL("../../yona-original/app/views/search/partial_search.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
  ]);

  expect(partial).toContain("search-category-wrap");
  expect(pageLess).toContain(".search-category-wrap");
  expect(route).toContain('data-owner="project-search-category-list"');
  expect(route).toContain('data-owner="project-search-category-item"');
  expect(route).toContain("data-active");
  expect(route).toContain("search-category-wrap");
});

test("project search category wrapper stays contained at desktop and mobile widths", async ({
  page,
}) => {
  await mockProjectSearchCategory(page);
  const basePath = "/yona";

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/search?keyword=bug&searchType=issue`);
    // The shared Bootstrap span grid can retain legacy page-level overflow on
    // narrow screens; this contract isolates the category owner’s bounds.
    const metrics = await page
      .locator('[data-owner="project-search-category-list"]')
      .evaluate((list) => {
        const box = list.getBoundingClientRect();
        const item = list.querySelector('[data-owner="project-search-category-item"]');
        const action = item?.querySelector("a");
        if (!item || !action) return null;
        const itemBox = item.getBoundingClientRect();
        const actionBox = action.getBoundingClientRect();
        return {
          box: { left: box.left, right: box.right, width: box.width },
          item: { left: itemBox.left, right: itemBox.right },
          action: { left: actionBox.left, right: actionBox.right },
          viewportWidth: window.innerWidth,
        };
      });
    expect(metrics).not.toBeNull();
    expect(metrics!.box.width).toBeGreaterThan(0);
    expect(metrics!.item.left).toBeGreaterThanOrEqual(metrics!.box.left);
    expect(metrics!.item.right).toBeLessThanOrEqual(metrics!.box.right + 1);
    expect(metrics!.action.left).toBeGreaterThanOrEqual(metrics!.item.left);
    // Legacy anchors use width:100% with horizontal padding, so their border box
    // may extend past the li/list content box; it must remain inside the viewport.
    expect(metrics!.action.right).toBeLessThanOrEqual(metrics!.viewportWidth + 1);
  }
});

async function mockProjectSearchCategory(page: Page) {
  await page.addInitScript(() => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: "/yona",
      supportedLanguages: ["ko-KR"],
    };
  });
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const pattern of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(pattern, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
  await page.route("**/api/v1/projects/**/**/search?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "", ownerName: "weblabs", projectName: "demo" },
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
        keyword: "bug",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "project",
        searchType: "issue",
        totalCount: 1,
      },
    }),
  );
}
