import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const screenshotDirectory = resolve("../output/playwright/stylex-global-search-results");
const screenshotMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";

const counts = {
  issueComments: 0,
  issues: 0,
  milestones: 0,
  postComments: 0,
  posts: 0,
  projects: 1,
  reviews: 0,
  users: 0,
};

const project = {
  authorLabel: "Admin",
  authorLoginId: "admin",
  createdLabel: "Jun 30, 2026",
  href: "/admin/sample",
  id: "project-1",
  number: "",
  originOwnerName: "origin",
  originProjectName: "base",
  ownerName: "admin",
  projectLogoUrl: "",
  projectName: "sample",
  snippets: [{ highlights: [], text: "Sample project" }],
  state: "",
  title: "",
  type: "project",
  updatedLabel: "Jul 1, 2026",
};

const issue = {
  authorLabel: "Admin",
  authorLoginId: "admin",
  createdLabel: "today",
  href: "/admin/sample/issue/1",
  id: "issue-1",
  number: "1",
  ownerName: "admin",
  projectName: "sample",
  snippets: [{ highlights: [], text: "Issue body" }],
  state: "OPEN",
  title: "Sample issue",
  type: "issue",
  updatedLabel: "",
};

test("global search result wave records the frozen populated and empty boundaries", () => {
  const route = readFileSync("src/routes/search.tsx", "utf8");
  const style = readFileSync("src/routes/-search.stylex.ts", "utf8");
  const partial = readFileSync(
    resolve(repoRoot, "yona-original/app/views/search/partial_search.scala.html"),
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
  expect(partial).toContain("search-category-wrap");
  expect(partial).toContain("search-result-wrap");
  expect(route).toContain(
    'import defaultProjectLogoUrl from "../assets/legacy/project_default_logo.png";',
  );
  expect(route).toContain("item.projectLogoUrl?.trim() || defaultProjectLogoUrl");
  for (const owner of [
    "global-search-result-list",
    "global-search-result-item",
    "global-search-result-title-wrap",
    "global-search-result-title",
    "global-search-avatar",
    "global-search-avatar-image",
    "global-search-content",
    "global-search-meta",
    "global-search-keyword",
    "global-search-empty-result",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const styleName of [
    "resultList",
    "resultItem",
    "resultItemProject",
    "resultTitleWrap",
    "resultTitle",
    "avatar",
    "avatarImage",
    "content",
    "contentBody",
    "meta",
    "emptyResult",
  ]) {
    expect(style).toContain(`${styleName}:`);
  }
  for (const declaration of [
    ".search-list-item",
    "padding:15px 15px 15px 60px",
    ".avatar-wrap",
    "width:40px",
    "height:40px",
    "margin-left:-55px",
    ".title-wrap",
    ".search-content",
    "strong.keyword",
    ".empty-result",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(bootstrap).toContain(".unstyled");
  expect(bootstrap).toContain(".pull-left");
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
  test(`global search populated project results at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockGlobalSearch(page);
    await page.goto(`${basePath}/search?keyword=sample&searchType=project`);

    const resultList = page.locator('[data-stylex-owner="global-search-result-list"]');
    const resultItem = page.locator('[data-stylex-owner="global-search-result-item"]');
    const titleWrap = page.locator('[data-stylex-owner="global-search-result-title-wrap"]');
    const title = page.locator(".title-wrap .project-link");
    const avatar = page.locator('[data-stylex-owner="global-search-avatar"]');
    const avatarImage = page.locator('[data-stylex-owner="global-search-avatar-image"]');
    const content = page.locator('[data-stylex-owner="global-search-content"]');
    const meta = page.locator('[data-stylex-owner="global-search-meta"]');
    const originMeta = meta.nth(0);
    const detailsMeta = meta.nth(1);
    const keyword = page.locator('[data-stylex-owner="global-search-keyword"]');

    await expect(resultList).toBeVisible();
    await expect(resultItem).toHaveCount(1);
    await expect(titleWrap).toHaveText("admin/sample");
    await expect(title).toHaveAttribute("href", `${basePath}/admin/sample`);
    await expect(avatar).toHaveClass(/\bavatar-wrap\b/u);
    await expect(avatarImage).toHaveAttribute("src", /project_default_logo/u);
    await expect.poll(() => avatarImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(content).toContainText("Sample project");
    await expect(meta).toHaveCount(2);
    await expect(originMeta).toContainText("Forked from");
    await expect(detailsMeta).toContainText("Create a project");
    await expect(detailsMeta).toContainText("Latest code update");
    await expect(keyword).toHaveCount(2);
    for (const keywordOwner of [keyword.nth(0), keyword.nth(1)]) {
      await expect(keywordOwner).toHaveText(/sample/iu);
    }
    await expect(resultList).toHaveCSS("list-style-type", "none");
    await expect(resultItem).toHaveCSS("position", "relative");
    await expect(resultItem).toHaveCSS("padding", "15px 15px 15px 60px");
    await expect(titleWrap).toHaveCSS("font-size", "16px");
    await expect(titleWrap).toHaveCSS("line-height", "30px");
    await expect(avatar).toHaveCSS("width", "40px");
    await expect(avatar).toHaveCSS("height", "40px");
    await expect(avatar).toHaveCSS("margin-left", "-55px");
    // Frozen source is width/height:100%; Chrome resolves those percentages to the 40px avatar box.
    await expect(avatarImage).toHaveCSS("width", "40px");
    await expect(avatarImage).toHaveCSS("height", "40px");
    await expect(avatarImage).toHaveCSS("vertical-align", "top");
    await expect(content).toHaveCSS("font-size", "14px");
    await expect(originMeta).toHaveCSS("margin-top", "0px");
    await expect(detailsMeta).toHaveCSS("margin-top", "10px");
    await expect(originMeta).toHaveCSS("font-size", "13px");
    await expect(detailsMeta).toHaveCSS("font-size", "13px");
    for (const owner of [
      resultItem,
      titleWrap,
      avatar,
      avatarImage,
      content,
      originMeta,
      detailsMeta,
    ]) {
      await expect(owner).not.toHaveAttribute("style", /.+/u);
    }

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('[data-stylex-owner="global-search-result-list"]');
      const item = document.querySelector('[data-stylex-owner="global-search-result-item"]');
      const avatarElement = document.querySelector('[data-stylex-owner="global-search-avatar"]');
      const contentElement = document.querySelector('[data-stylex-owner="global-search-content"]');
      const metaElements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-stylex-owner="global-search-meta"]'),
      );
      if (!list || !item || !avatarElement || !contentElement || metaElements.length < 2) {
        return null;
      }
      const listBox = list.getBoundingClientRect();
      const itemBox = item.getBoundingClientRect();
      const avatarBox = avatarElement.getBoundingClientRect();
      const contentBox = contentElement.getBoundingClientRect();
      const metaBoxes = metaElements.map((element) => element.getBoundingClientRect());
      return {
        avatarBox,
        contentBox,
        itemBox,
        listBox,
        metaBoxes,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.itemBox.left).toBeGreaterThanOrEqual(geometry!.listBox.left);
    expect(geometry!.itemBox.right).toBeLessThanOrEqual(geometry!.listBox.right + 1);
    expect(geometry!.avatarBox.left).toBeGreaterThanOrEqual(geometry!.itemBox.left - 55);
    expect(geometry!.contentBox.right).toBeLessThanOrEqual(geometry!.itemBox.right + 1);
    for (const metaBox of geometry!.metaBoxes) {
      expect(metaBox.right).toBeLessThanOrEqual(geometry!.itemBox.right + 1);
    }
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(geometry!.viewportWidth);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `global-search-results-${screenshotMode}-populated-${viewport.name}.png`,
      ),
    });

    if (viewport.name === "desktop") {
      await page.locator('[data-stylex-owner="global-search-category-item"]').first().click();
      await expect(page).toHaveURL(/searchType=issue/u);
    }
  });

  test(`global search empty results at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockGlobalSearch(page, true);
    await page.goto(`${basePath}/search?keyword=missing&searchType=project`);

    const empty = page.locator('[data-stylex-owner="global-search-empty-result"]');
    await expect(empty).toBeVisible();
    await expect(page.locator('[data-stylex-owner="global-search-result-list"]')).toHaveCount(0);
    await expect(empty).toHaveClass(/\bempty-result\b/u);
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

    const geometry = await empty.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        scrollWidth: document.documentElement.scrollWidth,
        top: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `global-search-results-${screenshotMode}-empty-${viewport.name}.png`,
      ),
    });
  });
}

async function mockGlobalSearch(page: Page, empty = false) {
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
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: {} }),
  );
  await page.route("**/api/v1/search**", (route) => {
    const searchType = new URL(route.request().url()).searchParams.get("searchType");
    const isIssue = searchType === "issue";
    const items = empty ? [] : isIssue ? [issue] : [project];
    route.fulfill({
      contentType: "application/json",
      json: {
        context: { organizationName: "", ownerName: "", projectName: "" },
        counts:
          empty || isIssue ? { ...counts, issues: empty ? 0 : 1, projects: empty ? 0 : 0 } : counts,
        items,
        keyword: empty ? "missing" : isIssue ? "sample" : "sample",
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: searchType ?? "project",
        scope: "global",
        searchType: searchType ?? "project",
        totalCount: items.length,
      },
    });
  });
}
