import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = (process.env.YONA_DEV_BASE_PATH ?? "/yona").replace(/\/$/u, "");
const ROUTE = "src/routes/organizations/$organizationName/search.tsx";
const STYLE = "src/routes/organizations/$organizationName/-organization-search.stylex.ts";

test("organization search category wrapper has legacy-backed StyleX ownership", async () => {
  const [route, style, partial, pageLess] = await Promise.all([
    readFile(ROUTE, "utf8"),
    readFile(STYLE, "utf8"),
    readFile("../yona-original/app/views/search/partial_search.scala.html", "utf8"),
    readFile("../yona-original/app/assets/stylesheets/less/_page.less", "utf8"),
  ]);

  expect(partial).toContain("search-category-wrap");
  expect(pageLess).toContain(".search-category-wrap");
  expect(route).toContain('data-stylex-owner="organization-search-category-list"');
  expect(route).toContain('data-stylex-owner="organization-search-category-item"');
  expect(route).toContain('data-stylex-owner="organization-search-content-column"');
  expect(route).toContain('data-stylex-owner="organization-search-grid-row"');
  expect(route).toContain('className="lst-stacked unstyled search-category-wrap"');
  for (const declaration of [
    "gridRow:",
    "category:",
    "contentColumn:",
    "categoryList:",
    "categoryItem:",
    "categoryAction:",
  ]) {
    expect(style).toContain(declaration);
  }
});

test.describe("organization search category geometry", () => {
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 900, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} keeps category wrapper contained beside results`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installOrganizationSearchMocks(page);
      await page.goto(
        `${BASE_PATH}/organizations/weblabs/search?keyword=sample&searchType=project`,
      );
      const category = page.locator('[data-stylex-owner="organization-search-category-list"]');
      const row = page.locator('[data-stylex-owner="organization-search-grid-row"]');
      const content = page.locator(
        '[data-stylex-owner="organization-search-content-column"]',
      );
      await expect(category).toBeVisible();
      await expect(category.locator("li")).toHaveCount(8);
      const boxes = await Promise.all([
        row.boundingBox(),
        category.boundingBox(),
        content.boundingBox(),
        page.locator('[data-stylex-owner="organization-search-category-item"]').first().boundingBox(),
      ]);
      expect(boxes[0]).toBeTruthy();
      expect(boxes[1]).toBeTruthy();
      expect(boxes[2]).toBeTruthy();
      expect(boxes[3]).toBeTruthy();
      expect(boxes[0]!.width).toBeGreaterThan(0);
      expect(boxes[0]!.height).toBeGreaterThan(0);
      if (viewport.width >= 768) {
        expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);
      } else {
        expect(boxes[1]!.x).toBeLessThanOrEqual(boxes[2]!.x);
      }
      expect(boxes[3]!.width).toBeGreaterThan(0);
      expect(boxes[3]!.height).toBeGreaterThan(0);
      const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
      for (const box of boxes) {
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
      }
    });
  }
});

async function installOrganizationSearchMocks(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        logoUrl: "",
        managers: [],
        members: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/search?**", async (route) => {
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "sample";
    const searchType = url.searchParams.get("searchType") ?? "project";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: { organizationName: "weblabs", ownerName: "", projectName: "" },
        counts: {
          issueComments: 0,
          issues: 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 1,
          reviews: 0,
          users: 0,
        },
        items: [
          {
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            createdLabel: "Jun 30, 2026",
            href: "/admin/sample",
            id: "sample",
            number: "",
            ownerName: "admin",
            projectLogoUrl: "/assets/images/project_default_logo.png",
            projectName: "sample",
            snippets: [{ highlights: [], text: "Sample project", truncated: false }],
            state: "active",
            title: "admin/sample",
            type: "project",
            updatedLabel: "Jul 1, 2026",
          },
        ],
        keyword,
        pageNum: Number(url.searchParams.get("pageNum") ?? "1"),
        pageSize: 20,
        requestedSearchType: searchType,
        scope: "organization",
        searchType,
        totalCount: 1,
        totalPages: 1,
      }),
    });
  });
}
