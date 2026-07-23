import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const screenshotDirectory = resolve("../output/playwright/stylex-organization-search-results");
const screenshotMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";

const issue = {
  authorLabel: "Admin",
  authorLoginId: "admin",
  createdLabel: "today",
  href: "/admin/sample/issue/11",
  id: "issue-11",
  number: "11",
  ownerName: "admin",
  projectName: "sample",
  snippets: [{ highlights: [], text: "A flaky issue body" }],
  state: "OPEN",
  title: "Fix flaky issue",
  type: "issue",
  updatedLabel: "",
};

test("organization search result wave records frozen issue/empty ownership", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/search.tsx", "utf8");
  const style = readFileSync(
    "src/routes/organizations/$organizationName/-organization-search.stylex.ts",
    "utf8",
  );
  const partial = readFileSync(
    resolve(repoRoot, "yona-original/app/views/search/partial_search.scala.html"),
    "utf8",
  );
  const resultTemplate = readFileSync(
    resolve(repoRoot, "yona-original/app/views/search/result.scala.html"),
    "utf8",
  );
  const pageLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const messages = readFileSync(resolve(repoRoot, "yona-original/conf/messages"), "utf8");
  const yobiLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );

  for (const partialName of [
    "partial_issues.scala.html",
    "partial_users.scala.html",
    "partial_projects.scala.html",
    "partial_posts.scala.html",
    "partial_milestones.scala.html",
    "partial_issue_comments.scala.html",
    "partial_post_comments.scala.html",
    "partial_reviews.scala.html",
  ]) {
    expect(
      readFileSync(resolve(repoRoot, "yona-original/app/views/search", partialName), "utf8"),
    ).toContain("search-list-item");
  }
  expect(resultTemplate).toContain("partial_search");
  expect(partial).toContain("search-result-wrap");
  for (const owner of [
    "organization-search-result-item",
    "organization-search-result-item-title",
    "organization-search-result-item-content",
    "organization-search-result-item-meta",
    "organization-search-keyword",
    "organization-search-empty",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const styleName of [
    "resultItem",
    "resultItemProject",
    "titleWrap",
    "postId",
    "title",
    "content",
    "contentBody",
    "meta",
    "keyword",
    "empty",
  ]) {
    expect(style).toContain(`${styleName}:`);
  }
  for (const declaration of [
    ".search-list-item",
    "position: relative",
    "padding:15px",
    ".title-wrap",
    "line-height: 30px",
    "font-size: 16px",
    ".search-content",
    "font-size: 14px",
    "margin-top:10px",
    "font-size: 13px",
    "strong.keyword",
    "background-color: #6BC4E9",
    ".empty-result",
    "min-height: 250px",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(bootstrap).toContain(".row-fluid .span10");
  for (const messageKey of ["search.menu.issues", "search.result.title", "issue.noAuthor"]) {
    expect(messages).toContain(messageKey);
  }
  for (const importedStylesheet of [
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]) {
    expect(yobiLess).toContain(importedStylesheet);
  }
  // Live legacy rendering is unavailable in this harness; screenshot parity remains unverified.
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const) {
  test(`organization search populated issue result at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockOrganizationSearch(page);
    await page.goto(
      `${basePath}/organizations/weblabs/search?keyword=flaky&searchType=issue&pageNum=1`,
    );

    const resultItem = page.locator('[data-stylex-owner="organization-search-result-item"]');
    const titleWrap = page.locator('[data-stylex-owner="organization-search-title-wrap"]');
    const title = page.locator('[data-stylex-owner="organization-search-result-item-title"]');
    const content = page.locator('[data-stylex-owner="organization-search-result-item-content"]');
    const meta = page.locator('[data-stylex-owner="organization-search-result-item-meta"]');
    const keywords = page.locator('[data-stylex-owner="organization-search-keyword"]');

    await expect(resultItem).toBeVisible();
    await expect(resultItem).toHaveClass(/\bsearch-list-item\b/u);
    await expect(titleWrap).toContainText("#11");
    await expect(title).toHaveText("Fix flaky issue");
    await expect(title).toHaveAttribute("href", `${basePath}/admin/sample/issue/11`);
    await expect(content).toContainText("A flaky issue body");
    await expect(meta).toContainText("admin/sample");
    await expect(meta).toContainText("Admin");
    await expect(meta).toContainText("today");
    await expect(keywords).toHaveCount(2);
    for (const keyword of [keywords.nth(0), keywords.nth(1)]) {
      await expect(keyword).toHaveText(/flaky/iu);
    }
    await expect(resultItem).toHaveCSS("position", "relative");
    await expect(resultItem).toHaveCSS("display", "block");
    await expect(resultItem).toHaveCSS("float", "none");
    await expect(resultItem).toHaveCSS("margin", "0px");
    await expect(resultItem).toHaveCSS("padding", "15px");
    await expect(titleWrap).toHaveCSS("line-height", "30px");
    await expect(titleWrap).toHaveCSS("font-size", "16px");
    await expect(titleWrap).toHaveCSS("font-weight", "700");
    await expect(content).toHaveCSS("font-size", "14px");
    await expect(content).toHaveCSS("padding-left", "20px");
    await expect(meta).toHaveCSS("margin-top", "10px");
    await expect(meta).toHaveCSS("font-size", "13px");
    await expect(meta).toHaveCSS("padding-left", "20px");
    for (const owner of [resultItem, titleWrap, title, content, meta]) {
      await expect(owner).not.toHaveAttribute("style", /.+/u);
    }

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('[data-stylex-owner="organization-search-list"]');
      const item = document.querySelector('[data-stylex-owner="organization-search-result-item"]');
      const titleBox = document
        .querySelector('[data-stylex-owner="organization-search-result-item-title"]')
        ?.getBoundingClientRect();
      const contentBox = document
        .querySelector('[data-stylex-owner="organization-search-result-item-content"]')
        ?.getBoundingClientRect();
      const metaBox = document
        .querySelector('[data-stylex-owner="organization-search-result-item-meta"]')
        ?.getBoundingClientRect();
      if (!list || !item || !titleBox || !contentBox || !metaBox) return null;
      const listBox = list.getBoundingClientRect();
      const itemBox = item.getBoundingClientRect();
      return {
        contentBox,
        itemBox,
        listBox,
        metaBox,
        scrollWidth: document.documentElement.scrollWidth,
        titleBox,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.itemBox.left).toBeGreaterThanOrEqual(geometry!.listBox.left);
    expect(geometry!.itemBox.right).toBeLessThanOrEqual(geometry!.listBox.right + 1);
    expect(geometry!.titleBox.right).toBeLessThanOrEqual(geometry!.itemBox.right + 1);
    expect(geometry!.contentBox.right).toBeLessThanOrEqual(geometry!.itemBox.right + 1);
    expect(geometry!.metaBox.right).toBeLessThanOrEqual(geometry!.itemBox.right + 1);
    // Fallback-off retains the known authenticated project/search shell's 8px baseline overflow;
    // result/item/content/meta boxes above remain strictly contained by their owned boundaries.
    const documentWidthLimit =
      screenshotMode === "fallback-off" ? geometry!.viewportWidth + 8 : geometry!.viewportWidth;
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(documentWidthLimit);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `organization-search-results-${screenshotMode}-populated-${viewport.name}.png`,
      ),
    });

    if (viewport.name === "desktop") {
      await page
        .locator('[data-stylex-owner="organization-search-category-item"] button')
        .nth(1)
        .click();
      await expect(page).toHaveURL(/searchType=user/u);
    }
  });

  test(`organization search empty result at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockOrganizationSearch(page, true);
    await page.goto(
      `${basePath}/organizations/weblabs/search?keyword=missing&searchType=issue&pageNum=1`,
    );

    const empty = page.locator('[data-stylex-owner="organization-search-empty"]');
    await expect(empty).toBeVisible();
    await expect(page.locator('[data-stylex-owner="organization-search-list"]')).toHaveCount(0);
    await expect(empty).toHaveCSS("min-height", "250px");
    await expect(empty).toHaveCSS("margin-top", "20px");
    await expect(empty).toHaveCSS("margin-bottom", "20px");
    await expect(empty).toHaveCSS("padding-left", "20px");
    await expect(empty).toHaveCSS("padding-right", "20px");
    await expect(empty).toHaveCSS("text-align", "center");
    await expect(empty).toHaveCSS("background-repeat", "no-repeat");
    const emptyStyle = await empty.getAttribute("style");
    expect(emptyStyle).toContain("--x-backgroundImage:");
    expect(emptyStyle).not.toMatch(
      /(?:width|height|padding|margin|top|right|bottom|left|position)\s*:/iu,
    );
    expect(await empty.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain(
      "no_contents",
    );

    const geometry = await empty.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    // The same fallback-off shell baseline is out of scope; the owned empty box remains contained.
    const documentWidthLimit =
      screenshotMode === "fallback-off" ? geometry.viewportWidth + 8 : geometry.viewportWidth;
    expect(geometry.scrollWidth).toBeLessThanOrEqual(documentWidthLimit);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `organization-search-results-${screenshotMode}-empty-${viewport.name}.png`,
      ),
    });
  });
}

async function mockOrganizationSearch(page: Page, empty = false) {
  const session = {
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
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "weblabs" },
        counts: {
          issueComments: 0,
          issues: empty ? 0 : 1,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items: empty ? [] : [issue],
        keyword: empty ? "missing" : "flaky",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "organization",
        searchType: "issue",
        totalCount: empty ? 0 : 1,
      },
    }),
  );
}
