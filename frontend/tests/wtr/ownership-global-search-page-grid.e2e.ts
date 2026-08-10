import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("global search page grid retains legacy source and route-local owners", async () => {
  const route = await readFile("src/routes/search.tsx", "utf8");
  const style = await readFile("src/app.css", "utf8");
  const resultTemplate = await readFile(
    "../yona-original/app/views/search/result.scala.html",
    "utf8",
  );
  const partial = await readFile(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  const bootstrap = await readFile("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const responsive = await readFile(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );

  expect(resultTemplate).toContain("partial_search");
  expect(partial).toContain('<div class="row-fluid">');
  expect(partial).toContain('<div class="span2">');
  expect(partial).toContain('<div class="span10">');
  expect(bootstrap).toContain(".row-fluid .span2");
  expect(bootstrap).toContain(".row-fluid .span10");
  expect(responsive).toContain('.row-fluid [class*="span"]');

  for (const owner of [
    "global-search-grid-row",
    "global-search-category",
    "global-search-results-column",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
});

test("global search page grid stays bounded at desktop and mobile widths", async ({ page }) => {
  const session = {
    actorId: 1,
    defaultLandingPath: "/",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/auth/session", "**/api/v1/auth/session", "**/api/v1/session"]) {
    await page.route(path, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
        items: [
          {
            authorLabel: "Admin",
            authorLoginId: "admin",
            createdLabel: "today",
            href: "/admin/sample/issue/1",
            id: "1",
            number: "1",
            ownerName: "admin",
            projectName: "sample",
            snippets: [{ highlights: [], text: "Issue body" }],
            state: "OPEN",
            title: "Grid issue",
            type: "issue",
            updatedLabel: "",
          },
        ],
        keyword: "grid",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        searchType: "issue",
        totalCount: 1,
      },
    }),
  );

  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/yona/search?keyword=grid&searchType=issue", {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[data-owner="global-search-grid-row"]').waitFor();
    const geometry = await page.evaluate(() => {
      const row = document.querySelector('[data-owner="global-search-grid-row"]');
      const category = document.querySelector('[data-owner="global-search-category"]');
      const results = document.querySelector('[data-owner="global-search-results-column"]');
      if (!row || !category || !results) return null;
      const rowRect = row.getBoundingClientRect();
      const categoryRect = category.getBoundingClientRect();
      const resultsRect = results.getBoundingClientRect();
      return {
        categoryHeight: categoryRect.height,
        categoryLeft: categoryRect.left,
        categoryRight: categoryRect.right,
        resultsLeft: resultsRect.left,
        resultsRight: resultsRect.right,
        rowLeft: rowRect.left,
        rowRight: rowRect.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.categoryHeight).toBeGreaterThan(0);
    expect(geometry!.rowRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.resultsRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    if (width <= 767) {
      expect(geometry!.categoryLeft).toBeCloseTo(geometry!.rowLeft, 0);
      expect(geometry!.resultsLeft).toBeCloseTo(geometry!.rowLeft, 0);
    } else {
      expect(geometry!.categoryRight).toBeLessThan(geometry!.resultsLeft);
    }
  }
});
