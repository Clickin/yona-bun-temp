import { expect, test, type Page } from "@playwright/test";

const ROOT_CLASS_NAMES = [
  "unsupported hidden",
  "gnb-outer project-header",
  "project-header-outer",
  "project-menu-outer",
  "site-breadcrumb-outer",
  "page-wrap-outer",
  "page-footer-outer",
];

test("organization project search keeps the legacy organization shell with anchor-based category navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=sample&searchType=project`);

  await expect(page).toHaveTitle("Search");
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Search");
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  expect(await screenRootClassNames(page)).toEqual(ROOT_CLASS_NAMES);

  const categoryLinks = page.locator(".search-category-wrap li > a");
  await expect(categoryLinks).toHaveCount(8);
  await expect(page.locator(".search-category-wrap li > button")).toHaveCount(0);
  await expect(page.locator(".search-category-wrap li.active a")).toHaveText("Projects0");

  const labels = await categoryLinks.evaluateAll((links) =>
    links.map((link) => link.textContent?.replace(/\s+/g, " ").trim() ?? ""),
  );
  expect(labels).toEqual([
    "Issues0",
    "Users0",
    "Projects0",
    "Posts0",
    "Milestones0",
    "Issue Comments0",
    "Post Comments0",
    "Code Reviews0",
  ]);

  await expect(categoryLinks.nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/search?keyword=sample&pageNum=1&searchType=issue`,
  );
  await expect(categoryLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/search?keyword=sample&pageNum=1&searchType=project`,
  );
  await expect(page.locator("#searchInnerForm")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page.locator('#searchInnerForm input[name="searchType"]')).toHaveValue("project");
  await expect(page.locator("#searchKeyword")).toHaveValue("sample");
  await expect(page.locator(".search-result-title")).toContainText("Found 0 result(s) in Projects");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator("#searchKeyword").fill("fresh");
  await expect(
    page.locator(".search-category-wrap li", { hasText: "Issues" }).locator("a"),
  ).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/search?keyword=fresh&pageNum=1&searchType=issue`,
  );
  await page.locator(".search-category-wrap li", { hasText: "Issues" }).locator("a").click();

  const navigatedUrl = new URL(page.url());
  expect(navigatedUrl.pathname).toBe(`${basePath}/organizations/weblabs/search`);
  expect(navigatedUrl.searchParams.get("keyword")).toBe("fresh");
  expect(navigatedUrl.searchParams.get("pageNum")).toBe("1");
  expect(navigatedUrl.searchParams.get("searchType")).toBe("issue");
  await expect(page.locator('#searchInnerForm input[name="searchType"]')).toHaveValue("issue");
  await expect(page.locator("#searchKeyword")).toHaveValue("fresh");
  await expect(page.locator(".search-category-wrap li.active a")).toHaveText("Issues0");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect.poll(() => searchApi.count).toBe(2);
});

test("organization project search pins the live localhost guest shell title and scope branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSearch(page, {
    anonymousSession: true,
    viewerCanCreateProject: false,
    viewerCanUpdate: false,
  });

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=sample&searchType=project`);

  await expect(page).toHaveTitle("Search");
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Y", "List All", "Feedback"]);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page.locator(".gnb-usermenu")).toContainText("Log in");
  await expect(page.locator(".gnb-usermenu")).toContainText("Sign up");
  await expect(page.locator(".project-setting a")).toHaveCount(0);
  await expect(page.locator(".search-category-wrap li.active a")).toHaveText("Projects0");
  await expect(page.locator(".search-result-title")).toHaveText("Found 0 result(s) in Projects");

  const metrics = await page.evaluate(() => {
    const navbar = document.querySelector("header.gnb-outer");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    const category = document.querySelector(".search-category-wrap");
    const resultTitle = document.querySelector(".search-result-title");
    if (!(navbar instanceof HTMLElement)) {
      throw new Error("Missing header.gnb-outer");
    }
    if (!(scopeButton instanceof HTMLElement)) {
      throw new Error("Missing #gnb-search-scope-title");
    }
    if (!(searchBox instanceof HTMLElement)) {
      throw new Error("Missing .gnb-search-form .search-box");
    }
    if (!(category instanceof HTMLElement)) {
      throw new Error("Missing .search-category-wrap");
    }
    if (!(resultTitle instanceof HTMLElement)) {
      throw new Error("Missing .search-result-title");
    }
    return {
      category: category.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      resultTitle: resultTitle.getBoundingClientRect(),
      scopeButton: scopeButton.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
    };
  });

  expect(metrics.scopeButton.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.scopeButton.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.searchBox.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.right).toBeLessThanOrEqual(metrics.navbar.right);
  expect(metrics.category.right).toBeLessThanOrEqual(metrics.resultTitle.left + 1);

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator(".gnb-search-form .dropdown-menu button")).toHaveText(["All Projects"]);
});

test("organization project search preserves the legacy two-column layout geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=sample&searchType=project`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();

  const layout = await page.evaluate(() => {
    const readBox = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        return null;
      }
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };

    return {
      breadcrumb: readBox(".site-breadcrumb-outer"),
      category: readBox(".search-category-wrap"),
      content: readBox(".span10"),
      emptyResult: readBox(".search-result-wrap .empty-result"),
      keyword: readBox("#searchKeyword"),
      pageWrap: readBox(".page-wrap-outer"),
      resultTitle: readBox(".search-result-title"),
      searchBox: readBox(".search-box-wrap"),
      searchButton: readBox("#searchInnerForm .ybtn"),
    };
  });

  expect(layout.breadcrumb).not.toBeNull();
  expect(layout.category).not.toBeNull();
  expect(layout.content).not.toBeNull();
  expect(layout.emptyResult).not.toBeNull();
  expect(layout.keyword).not.toBeNull();
  expect(layout.pageWrap).not.toBeNull();
  expect(layout.resultTitle).not.toBeNull();
  expect(layout.searchBox).not.toBeNull();
  expect(layout.searchButton).not.toBeNull();

  expect(layout.pageWrap!.top).toBeGreaterThanOrEqual(layout.breadcrumb!.bottom);
  expect(layout.category!.left).toBeLessThan(layout.content!.left);
  expect(layout.category!.right).toBeLessThan(layout.content!.right);
  expect(layout.keyword!.top).toBeCloseTo(layout.searchButton!.top, 0);
  expect(layout.keyword!.bottom).toBeCloseTo(layout.searchButton!.bottom, 0);
  expect(layout.keyword!.right).toBeLessThan(layout.searchButton!.left);
  expect(layout.searchButton!.right).toBeLessThanOrEqual(layout.searchBox!.right);
  expect(layout.resultTitle!.top).toBeGreaterThan(layout.keyword!.bottom);
  expect(layout.emptyResult!.top).toBeGreaterThan(layout.resultTitle!.bottom);
  expect(layout.emptyResult!.left).toBeGreaterThanOrEqual(layout.content!.left);
});

test("organization search without required query keeps the legacy bad-request shell and Home link SPA semantics", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page);

  await page.goto(`${basePath}/organizations/weblabs/search`);

  const homeLink = page.locator(".error-wrap .ybtn.ybtn-info");
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(homeLink).toHaveAttribute("href", expectedHomeHref(basePath));
  expect(await screenRootClassNames(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".site-breadcrumb-outer")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApi.count).toBe(0);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await homeLink.click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedHomeHref(basePath));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization search forbidden keeps the legacy organization shell without the site-level error action", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page, { searchStatus: 403 });

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=blocked&searchType=project`);

  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText("You are not authorized");
  await expect(page.locator(".error-wrap .ybtn")).toHaveCount(0);
  await expect(page.locator(".site-breadcrumb-outer")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(await screenRootClassNames(page)).toEqual([
    "unsupported hidden",
    "gnb-outer project-header",
    "project-header-outer",
    "project-menu-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);
  await expect.poll(() => searchApi.count).toBeGreaterThanOrEqual(1);
});

test("organization search internal server error keeps the legacy default error shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockOrganizationSearch(page, { searchStatus: 500 });

  await page.goto(`${basePath}/organizations/weblabs/search?keyword=boom&searchType=project`);

  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "Server error occurred; service is not available",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    expectedHomeHref(basePath),
  );
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".site-breadcrumb-outer")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(await screenRootClassNames(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);
  await expect.poll(() => searchApi.count).toBeGreaterThanOrEqual(1);
});

async function mockOrganizationSearch(
  page: Page,
  options: {
    anonymousSession?: boolean;
    searchStatus?: 403 | 500;
    viewerCanCreateProject?: boolean;
    viewerCanUpdate?: boolean;
  } = {},
) {
  const apiCalls = { count: 0 };

  await page.route("**/api/v1/session", async (route) => {
    const session = options.anonymousSession
      ? {
          defaultLandingPath: "/",
          isAnonymous: true,
          isSiteAdmin: false,
        }
      : {
          actorId: 1,
          avatarUrl: "/assets/images/default-avatar-32.png",
          defaultLandingPath: "/",
          emailAddress: "admin@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          userLabel: "Site Admin",
        };

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        managers: [],
        members: [],
        organizationName: "weblabs",
        visibleProjects: [],
        viewerCanCreateProject: options.viewerCanCreateProject ?? true,
        viewerCanUpdate: options.viewerCanUpdate ?? true,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/search?**", async (route) => {
    apiCalls.count += 1;
    if (options.searchStatus) {
      await route.fulfill({
        contentType: "application/json",
        status: options.searchStatus,
        body: JSON.stringify({
          error: options.searchStatus === 403 ? "forbidden" : "internalServerError",
          message:
            options.searchStatus === 403
              ? "You are not authorized"
              : "Server error occurred; service is not available",
        }),
      });
      return;
    }
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "missing";
    const searchType = url.searchParams.get("searchType") ?? "project";
    const pageNum = Number.parseInt(url.searchParams.get("pageNum") ?? "1", 10);

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: {
          organizationName: "weblabs",
          ownerName: "",
          projectName: "",
        },
        counts: {
          issueComments: 0,
          issues: 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: [],
        keyword,
        pageNum,
        pageSize: 20,
        requestedSearchType: searchType,
        scope: "organization",
        searchType,
        totalCount: 0,
        totalPages: 1,
      }),
    });
  });

  return apiCalls;
}

async function screenRootClassNames(page: Page) {
  return page
    .locator(
      ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
    )
    .evaluateAll((roots) => roots.map((root) => root.className));
}

function expectedHomeHref(basePath: string) {
  return basePath === "/" ? "/" : basePath.replace(/\/$/u, "");
}
