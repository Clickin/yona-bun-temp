import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("global search category wrapper owns the legacy geometry in route-local StyleX", async () => {
  const route = await readFile("src/routes/search.tsx", "utf8");
  const legacy = await readFile(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  const pageLess = await readFile(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );

  expect(legacy).toContain("search-category-wrap");
  expect(pageLess).toContain(".search-category-wrap");
  for (const owner of [
    "global-search-category",
    "global-search-category-list",
    "global-search-category-item",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const declaration of [
    "globalSearchCategoryStyles",
    "borderTopWidth",
    "borderBottomWidth",
    "listStyle",
    "categoryItemActive",
  ]) {
    expect(route).toContain(declaration);
  }

  // Keep the frozen selector tokens as a compatibility bridge for the existing
  // global-search parity suite while StyleX owns the route-local geometry.
  for (const legacyClass of [
    "lst-stacked unstyled search-category-wrap",
    'category.type === activeType ? "active"',
    'count === 0 ? "empty"',
    "num-badge pull-right",
  ]) {
    expect(route).toContain(legacyClass);
  }
});

test("global search category geometry stays contained at desktop and mobile widths", async ({
  page,
}) => {
  const sessionResponse = {
    actorId: 1,
    defaultLandingPath: "/",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const sessionPath of [
    "**/api/auth/session",
    "**/api/v1/auth/session",
    "**/api/v1/session",
  ]) {
    await page.route(sessionPath, (route) =>
      route.fulfill({ contentType: "application/json", json: sessionResponse }),
    );
  }
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: {} }),
  );
  await page.route("**/api/v1/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "", ownerName: "", projectName: "" },
        counts: {
          issueComments: 0,
          issues: 1,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: [],
        keyword: "sample",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        searchType: "issue",
        totalCount: 0,
      },
    }),
  );

  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/yona/search?keyword=sample&searchType=issue`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[data-stylex-owner="global-search-category-list"]').waitFor();

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('[data-stylex-owner="global-search-category-list"]');
      const item = document.querySelector('[data-stylex-owner="global-search-category-item"]');
      const link = item?.querySelector("a");
      if (!list || !item || !link) return null;
      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      return {
        itemHeight: itemRect.height,
        linkLeft: linkRect.left,
        linkRight: linkRect.right,
        listLeft: listRect.left,
        listRight: listRect.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.listRight).toBeGreaterThan(geometry!.listLeft);
    expect(geometry!.itemHeight).toBeGreaterThan(0);
    // The frozen legacy rule uses width:100% with horizontal padding, so the
    // link can extend a few pixels past the list's content box. The actual
    // parity invariant is containment within the viewport, not the list box.
    expect(geometry!.linkLeft).toBeGreaterThanOrEqual(geometry!.listLeft - 1);
    expect(geometry!.linkRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.listRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
  }
});
