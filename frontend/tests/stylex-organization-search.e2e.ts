import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/organizations/$organizationName/search.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/organizations/$organizationName/-organization-search.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const fallbackCss = readFileSync(
  new URL("../public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
  "utf8",
);
const frozenPageLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);

const counts = {
  issueComments: 0,
  issues: 1,
  milestones: 0,
  postComments: 0,
  posts: 0,
  projects: 0,
  reviews: 0,
  users: 0,
};

function searchResponse(items: unknown[]) {
  return {
    context: { organizationName: "weblabs" },
    counts,
    items,
    keyword: "flaky",
    pageNum: 1,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "organization",
    searchType: "issue",
    totalCount: items.length,
  };
}

async function mockOrganizationSearch(page: Page, items: unknown[]) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        logoUrl: "",
        managers: [],
        members: [],
        organizationName: "weblabs",
        visibleProjects: [],
        viewerCanCreateProject: true,
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/search**", (route) =>
    route.fulfill({ contentType: "application/json", json: searchResponse(items) }),
  );
}

const issue = {
  authorLabel: "Admin",
  authorLoginId: "admin",
  createdLabel: "today",
  href: "/acme/sample/issue/11",
  id: "11",
  number: "11",
  ownerName: "acme",
  projectName: "sample",
  snippets: [{ highlights: [], text: "Body markdown" }],
  state: "OPEN",
  title: "Fix flaky issue",
  type: "issue",
  updatedLabel: "",
};

test("organization search maps the frozen result family to six route-local owners", () => {
  for (const owner of [
    "organization-search-category-item",
    "organization-search-result-title",
    "organization-search-result-item",
    "organization-search-title-wrap",
    "organization-search-content-meta",
    "organization-search-empty",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }

  for (const style of [
    "categoryItemActive",
    "categoryActionEmpty",
    "resultTitle",
    "resultItemProject",
    "avatarImage",
    "titleWrap",
    "postId",
    "contentNoPadding",
    "metaNoPadding",
    "empty",
  ]) {
    expect(styleSource).toContain(`${style}:`);
  }
  expect(styleSource).toContain("empty: (backgroundImage: string)");
  expect(routeSource).toContain('"/legacy-assets/images/no_contents.jpg"');

  const themeBlock = styleSource.slice(
    styleSource.indexOf("stylex.defineVars({"),
    styleSource.indexOf("});") + 3,
  );
  for (const geometry of ["margin:", "padding:", "width:", "height:"]) {
    expect(themeBlock).not.toContain(geometry);
  }
  expect(routeSource).not.toContain("document.querySelector");
  expect(appCss).not.toMatch(/(?:^|\n)\.empty-result\s*\{/u);
  for (const retainedSelector of [
    ".search-box-wrap {",
    ".search-result-title {",
    ".search-list-wrap {",
    ".search-content-body {",
    ".search-meta-info {",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
  for (const [source, declarations] of [
    [frozenPageLess, [".empty-result {", "padding:0 20px;", "min-height: 250px;"]],
    [
      fallbackCss,
      [
        ".empty-result {",
        "padding: 0 20px;",
        "margin: 20px 0;",
        "min-height: 250px;",
        'background-image: url(\"../images/no_contents.jpg\");',
      ],
    ],
  ] as const) {
    for (const declaration of declarations) expect(source).toContain(declaration);
  }
});

test("organization search preserves populated desktop owners, geometry, and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockOrganizationSearch(page, [issue]);
  await page.goto("/yona/organizations/weblabs/search?keyword=flaky&searchType=issue&pageNum=1");

  const resultItem = page.locator('[data-stylex-owner="organization-search-result-item"]');
  await expect(resultItem).toContainText("Fix flaky issue");
  await expect(resultItem.locator(".title")).toHaveAttribute("href", "/yona/acme/sample/issue/11");
  await expect(
    page.locator('[data-stylex-owner="organization-search-category-item"].active'),
  ).toHaveCSS("background-color", "rgb(81, 170, 204)");
  await expect(page.locator('[data-stylex-owner="organization-search-result-title"]')).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(resultItem).toHaveCSS("padding", "15px");
  await expect(page.locator('[data-stylex-owner="organization-search-title-wrap"]')).toHaveCSS(
    "line-height",
    "30px",
  );
  await expect(
    page.locator('[data-stylex-owner="organization-search-content-meta"]').first(),
  ).toHaveCSS("padding-left", "20px");

  await page
    .locator('[data-stylex-owner="organization-search-category-item"] button')
    .nth(1)
    .click();
  await expect(page).toHaveURL(/searchType=user/u);
});

test("organization search preserves mobile containment and the empty-result fallback image", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOrganizationSearch(page, []);
  await page.goto("/yona/organizations/weblabs/search?keyword=flaky&searchType=issue&pageNum=1");

  const empty = page.locator('[data-stylex-owner="organization-search-empty"]');
  await expect(empty).toBeVisible();
  await expect(empty).toHaveCSS("min-height", "250px");
  await expect(empty).toHaveCSS("background-repeat", "no-repeat");
  expect(await empty.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain(
    "/yona/legacy-assets/images/no_contents.jpg",
  );

  const geometry = await page.evaluate(() => {
    const pageWrap = document.querySelector('[data-stylex-owner="organization-search-page"]');
    const categories = document.querySelector(
      '[data-stylex-owner="organization-search-categories"]',
    );
    const emptyResult = document.querySelector('[data-stylex-owner="organization-search-empty"]');
    if (!pageWrap || !categories || !emptyResult) return null;
    const pageRect = pageWrap.getBoundingClientRect();
    const categoryRect = categories.getBoundingClientRect();
    const emptyRect = emptyResult.getBoundingClientRect();
    return {
      categoryRight: categoryRect.right,
      emptyLeft: emptyRect.left,
      emptyRight: emptyRect.right,
      emptyTop: emptyRect.top,
      pageLeft: pageRect.left,
      pageRight: pageRect.right,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.emptyLeft).toBeGreaterThanOrEqual(geometry!.categoryRight);
  expect(geometry!.emptyLeft).toBeGreaterThanOrEqual(geometry!.pageLeft);
  expect(geometry!.emptyRight).toBeLessThanOrEqual(geometry!.pageRight);
  expect(geometry!.scrollWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
});
