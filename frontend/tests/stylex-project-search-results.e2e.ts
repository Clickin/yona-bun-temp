import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const screenshotDirectory = resolve("../output/playwright/stylex-project-search-results");
const screenshotMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";

test("project search result wave records frozen Scala, LESS, and import provenance", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/search.tsx", "utf8");
  const style = readFileSync(
    "src/routes/$ownerName/$projectName/-project-search.stylex.ts",
    "utf8",
  );
  const resultTemplate = readFileSync(
    resolve(repoRoot, "yona-original/app/views/search/result.scala.html"),
    "utf8",
  );
  const searchPartial = readFileSync(
    resolve(repoRoot, "yona-original/app/views/search/partial_search.scala.html"),
    "utf8",
  );
  const partialNames = [
    "partial_issues.scala.html",
    "partial_users.scala.html",
    "partial_posts.scala.html",
    "partial_milestones.scala.html",
    "partial_issue_comments.scala.html",
    "partial_post_comments.scala.html",
    "partial_reviews.scala.html",
  ];
  const partials = partialNames.map((name) =>
    readFileSync(resolve(repoRoot, "yona-original/app/views/search", name), "utf8"),
  );
  const pageLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const yobiLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const bootstrapResponsive = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap-responsive.css"),
    "utf8",
  );
  const messages = readFileSync(resolve(repoRoot, "yona-original/conf/messages"), "utf8");

  expect(resultTemplate).toContain("partial_search");
  expect(searchPartial).toContain("search-result-wrap");
  expect(searchPartial).toContain("search.menu.issues");
  for (const partial of partials) expect(partial).toContain("search-list-item");
  for (const owner of [
    "project-search-result-item",
    "project-search-title",
    "project-search-content",
    "project-search-meta",
    "project-search-keyword",
    "project-search-empty-result",
    "project-search-result-item-title",
    "project-search-result-item-content-body",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const part of [
    "result-item-title",
    "result-item-content",
    "result-item-meta",
    "result-keyword",
    "empty-result",
  ]) {
    expect(route).toContain(`data-stylex-part="${part}"`);
  }
  for (const styleName of [
    "searchList",
    "searchListItem",
    "titleWrap",
    "postId",
    "title",
    "content",
    "contentBody",
    "meta",
    "metaItem",
    "keyword",
    "emptyResult",
  ]) {
    expect(style).toContain(`${styleName}:`);
  }
  for (const declaration of [
    ".search-list-wrap",
    ".search-list-item",
    "position: relative",
    "display: block",
    "float: none",
    "margin:0",
    "padding:15px",
    ".title-wrap",
    "line-height: 30px",
    "font-size: 16px",
    ".search-content",
    "font-size: 14px",
    "padding-left:20px",
    ".search-meta-info",
    "margin-top:10px",
    "font-size: 13px",
    "strong.keyword",
    "background-color: #6BC4E9",
    ".empty-result",
    "padding:0 20px",
    "margin: 20px 0",
    "text-align: center",
    "min-height: 250px",
    "background-position: center 50%",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(bootstrap).toContain(".row-fluid .span10");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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
  // The live legacy server was unavailable for this focused run; screenshot parity is unverified.
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const) {
  test(`project search populated issue result at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockProjectSearch(page);
    await page.goto(`${basePath}/admin/sample/search?keyword=flaky&searchType=issue&pageNum=1`);

    const item = page.locator('[data-stylex-owner="project-search-result-item"]');
    const titleWrap = page.locator('[data-stylex-part="result-item-title"]');
    const title = titleWrap.locator("a.title");
    const content = page.locator('[data-stylex-part="result-item-content"]');
    const meta = page.locator('[data-stylex-part="result-item-meta"]');
    const keywords = page.locator('[data-stylex-part="result-keyword"]');

    await expect(item).toBeVisible();
    await expect(item).toHaveClass(/\bsearch-list-item\b/u);
    await expect(titleWrap).toContainText("#11");
    await expect(title).toHaveText("Fix flaky issue");
    await expect(title).toHaveAttribute("data-stylex-owner", "project-search-result-item-title");
    await expect(title).toHaveAttribute("href", `${basePath}/admin/sample/issue/11`);
    await expect(content).toContainText("A flaky issue body");
    await expect(
      content.locator('[data-stylex-owner="project-search-result-item-content-body"]'),
    ).toBeVisible();
    await expect(meta.locator(".meta-item")).toHaveText(["Admin", "today"]);
    await expect(keywords).toHaveCount(2);
    await expect(keywords.nth(0)).toHaveText(/flaky/iu);
    await expect(keywords.nth(1)).toHaveText(/flaky/iu);

    await expect(item).toHaveCSS("position", "relative");
    await expect(item).toHaveCSS("display", "block");
    await expect(item).toHaveCSS("float", "none");
    await expect(item).toHaveCSS("margin", "0px");
    await expect(item).toHaveCSS("padding", "15px");
    await expect(titleWrap).toHaveCSS("line-height", "30px");
    await expect(titleWrap).toHaveCSS("font-size", "16px");
    await expect(titleWrap).toHaveCSS("font-weight", "700");
    await expect(content).toHaveCSS("font-size", "14px");
    await expect(content).toHaveCSS("padding-left", "20px");
    await expect(meta).toHaveCSS("margin-top", "10px");
    await expect(meta).toHaveCSS("font-size", "13px");
    await expect(meta).toHaveCSS("padding-left", "20px");
    for (const owner of [item, titleWrap, title, content, meta, keywords.first()]) {
      await expect(owner).not.toHaveAttribute("style", /.+/u);
    }

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('[data-stylex-owner="project-search-list"]');
      const itemNode = document.querySelector('[data-stylex-owner="project-search-result-item"]');
      const parts = [
        ...document.querySelectorAll<HTMLElement>('[data-stylex-part^="result-item-"]'),
      ];
      if (!list || !itemNode || parts.length !== 3) return null;
      const listBox = list.getBoundingClientRect();
      const itemBox = itemNode.getBoundingClientRect();
      return {
        item: { left: itemBox.left, right: itemBox.right },
        list: { left: listBox.left, right: listBox.right },
        parts: parts.map((part) => {
          const box = part.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top };
        }),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.item.left).toBeGreaterThanOrEqual(geometry!.list.left);
    expect(geometry!.item.right).toBeLessThanOrEqual(geometry!.list.right + 1);
    for (const part of geometry!.parts) {
      expect(part.left).toBeGreaterThanOrEqual(geometry!.item.left);
      expect(part.right).toBeLessThanOrEqual(geometry!.item.right + 1);
    }
    // The fallback-off authenticated project/search shell has an existing 8px
    // document baseline; all result-owned boxes above remain strictly contained.
    const documentWidthLimit =
      screenshotMode === "fallback-off" ? geometry!.viewportWidth + 8 : geometry!.viewportWidth;
    expect(geometry!.scrollWidth).toBeLessThanOrEqual(documentWidthLimit);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `project-search-results-${screenshotMode}-populated-${viewport.name}.png`,
      ),
    });

    if (viewport.name === "desktop") {
      await page.locator('[data-stylex-owner="project-search-category-item"]').nth(1).click();
      await expect(page).toHaveURL(/searchType=user/u);
    }
  });

  test(`project search empty result at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockProjectSearch(page);
    await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=issue&pageNum=1`);

    const empty = page.locator('[data-stylex-owner="project-search-empty-result"]');
    await expect(empty).toBeVisible();
    await expect(page.locator('[data-stylex-owner="project-search-list"]')).toHaveCount(0);
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
    await expect(empty).toHaveCSS("background-image", /no_contents/u);
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
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    const documentWidthLimit =
      screenshotMode === "fallback-off" ? geometry.viewportWidth + 8 : geometry.viewportWidth;
    expect(geometry.scrollWidth).toBeLessThanOrEqual(documentWidthLimit);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `project-search-results-${screenshotMode}-empty-${viewport.name}.png`,
      ),
    });
  });
}

async function mockProjectSearch(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yoram-project/yoram/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    defaultLandingPath: "/",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "project-search-results" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/search?**", (route) => {
    const keyword = new URL(route.request().url()).searchParams.get("keyword");
    const empty = keyword === "missing";
    return route.fulfill({
      contentType: "application/json",
      json: empty ? emptyResponse() : populatedResponse(),
    });
  });
}

function baseResponse() {
  return {
    context: { organizationName: "", ownerName: "admin", projectName: "sample" },
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
    keyword: "flaky",
    pageNum: 1,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "project",
    searchType: "issue",
    totalCount: 1,
  };
}

function populatedResponse() {
  return {
    ...baseResponse(),
    items: [
      {
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
      },
    ],
  };
}

function emptyResponse() {
  return {
    ...baseResponse(),
    counts: { ...baseResponse().counts, issues: 0 },
    items: [],
    keyword: "missing",
    totalCount: 0,
  };
}
