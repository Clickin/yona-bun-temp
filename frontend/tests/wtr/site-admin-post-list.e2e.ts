import { expect, test, type Page } from "../wtr-compat.ts";

const LEGACY_DEFAULT_AUTHOR_AVATAR_URL = "/assets/images/default-avatar-128.png";

test("site admin post list preserves legacy row navigation and layout", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/postList`);
  await expect(page).toHaveTitle("Site settings");
  expect(
    await page
      .locator("head > title")
      .evaluateAll((titles) => titles.map((title) => title.innerHTML)),
  ).toContain("Site settings");
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect.poll(() => new URL(page.url()).search).toBe("");
  await expect(page.locator('[data-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  expect(
    await page
      .locator('[data-owner="global-gnb-nav"] a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/`,
    `${basePath}/projects`,
    "https://github.com/yona-projects/yona/issues",
  ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator('[data-owner="site-post-list-setting-wrap"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-post-list-sidebar-link"]').nth(1)).toHaveText(
    "Posts",
  );
  await expect(page.locator('[data-owner="site-post-list-sidebar-link"]')).toHaveText([
    "Users",
    "Posts",
    "Issues",
    "Projects",
    "Send email",
    "Send mass emails",
    "Software Update",
    "Diagnostics",
  ]);
  expect(
    await page
      .locator(".site-setting-nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/sites/userList`,
    `${basePath}/sites/postList`,
    `${basePath}/sites/issueList`,
    `${basePath}/sites/projectList`,
    `${basePath}/sites/mail`,
    `${basePath}/sites/massmail`,
    `${basePath}/sites/update`,
    `${basePath}/sites/diagnostic`,
  ]);
  await expect(page.locator('[data-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator('[data-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "border-left-color",
    "rgb(243, 108, 34)",
  );
  expect(await siteSidebarAnchorActiveAttrs(page)).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Users" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Posts" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Issues" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Projects" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send email" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send mass emails" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Software Update" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Diagnostics" },
  ]);
  const shellBoxes = await page.evaluate(() => {
    const navbar = document.querySelector("[data-owner=global-gnb-outer]");
    const searchForm = document.querySelector('form[name="gnb-search-form"]');
    const listAllLink = document.querySelector(
      '[data-owner="global-gnb-nav"] a[href$="/projects"]',
    );
    const feedbackLink = document.querySelector(
      '[data-owner="global-gnb-nav"] a[href="https://github.com/yona-projects/yona/issues"]',
    );
    if (
      !(navbar instanceof HTMLElement) ||
      !(searchForm instanceof HTMLElement) ||
      !(listAllLink instanceof HTMLElement) ||
      !(feedbackLink instanceof HTMLElement)
    ) {
      return null;
    }

    const navbarRect = navbar.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const listAllRect = listAllLink.getBoundingClientRect();
    const feedbackRect = feedbackLink.getBoundingClientRect();

    return {
      feedback: {
        bottom: feedbackRect.bottom,
        left: feedbackRect.left,
        right: feedbackRect.right,
        top: feedbackRect.top,
      },
      listAll: {
        bottom: listAllRect.bottom,
        left: listAllRect.left,
        right: listAllRect.right,
        top: listAllRect.top,
      },
      navbar: {
        bottom: navbarRect.bottom,
        left: navbarRect.left,
        right: navbarRect.right,
        top: navbarRect.top,
      },
      searchForm: {
        bottom: searchFormRect.bottom,
        left: searchFormRect.left,
        right: searchFormRect.right,
        top: searchFormRect.top,
      },
    };
  });
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.listAll.left).toBeGreaterThan(shellBoxes!.navbar.left);
  expect(shellBoxes!.listAll.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.listAll.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.feedback.left).toBeGreaterThan(shellBoxes!.listAll.right);
  expect(shellBoxes!.feedback.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.feedback.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchForm.left).toBeGreaterThanOrEqual(shellBoxes!.feedback.right);
  expect(shellBoxes!.searchForm.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchForm.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchForm.right).toBeLessThanOrEqual(shellBoxes!.navbar.right);
  const authorAvatarImage = page.locator('[data-owner="site-post-list-author-avatar-image"]');
  await expect(authorAvatarImage).not.toHaveAttribute("alt", /.*/);
  await expect(authorAvatarImage).not.toHaveAttribute("width", /.*/);
  await expect(authorAvatarImage).not.toHaveAttribute("height", /.*/);
  await expect(page.locator('[data-owner="site-post-list-row"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="site-post-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(
    page.locator('[data-owner="site-post-list-metadata-item"] > a[href$="#comments"]'),
  ).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7#comments`);
  await expect(
    page.locator('[data-owner="site-post-list-sidebar-link"]', {
      hasText: "Send mass emails",
    }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator('[data-owner="site-post-list-pagination"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-post-list-pagination-item"]')).toHaveCount(5);
  await expect(page.locator("#pagination")).not.toHaveClass(/\bpage-navigation-wrap\b/u);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute("href", `${basePath}/sites/postList?pageNum=2`);
  await expect(nextPageLink).toHaveText("Next page");
  await expect(page.locator("#pagination a[pjax-page]")).toHaveCount(0);
  expect(await paginationAnchorAttrs(nextPageLink)).toEqual({
    ariaCurrent: null,
    className: null,
    dataStatus: null,
    text: "Next page",
    title: null,
  });

  await page.evaluate(async () => {
    await document.fonts.ready;
    const image = document.querySelector<HTMLImageElement>(
      '[data-owner="site-post-list-project-avatar-image"]',
    );
    if (!image) throw new Error("Missing project avatar image");
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }
    if (image.naturalWidth > 0) await image.decode();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  expect(await postListMetrics(page)).toEqual({
    avatarImageHeight: 34,
    avatarImageWidth: 45,
    avatarWrapHeight: 45,
    avatarWrapMarginRight: 10,
    avatarWrapMarginTop: 3,
    avatarWrapWidth: 45,
    contentWidthRatio: 0.83,
    firstRowLineHeight: 70,
    firstRowPaddingBlock: 20,
    metaAvatarHeight: 14,
    metaAvatarWidth: 14,
    metaFontSize: 11,
    metaItemMarginInline: 10,
    metaLineHeight: 20,
    postInfoLineHeight: 20,
    postInfoMarginTop: 5,
    postProjectColor: "rgb(0, 136, 204)",
    postProjectDisplay: "inline-block",
    postProjectFontSize: 15,
    postProjectFontWeight: "700",
    postTitleFontSize: 15,
    postTitleFontWeight: "700",
    separatorFontSize: 15,
    separatorFontWeight: "700",
    separatorPaddingInline: 10,
    sidebarWidthRatio: 0.15,
    titleAreaHeight: 39,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-posts-pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(page.locator('[data-owner="site-post-list-sidebar-link"]').nth(1)).toHaveText(
    "Posts",
  );
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  const previousPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  await expect(previousPageLink).toHaveAttribute("href", `${basePath}/sites/postList?pageNum=1`);
  await expect(previousPageLink).toHaveText("Previous page");
  expect(await paginationAnchorAttrs(previousPageLink)).toEqual({
    ariaCurrent: null,
    className: null,
    dataStatus: null,
    text: "Previous page",
    title: null,
  });
  await previousPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-pagination");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-posts-pagination-input";
  });
  const pageNumInput = page.locator('#pagination input[name="pageNum"]');
  await pageNumInput.click();
  await pageNumInput.fill("7");
  await pageNumInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pageNumInput).toHaveValue("2");

  const pageTwoUrl = page.url();
  await pageNumInput.click();
  await pageNumInput.fill("1e2");
  await pageNumInput.press("Enter");
  expect(page.url()).toBe(pageTwoUrl);
  await expect(pageNumInput).toHaveValue("2");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-pagination-input");

  await mockSiteUsers(page);
  const usersLink = page.locator('[data-owner="site-post-list-sidebar-link"]', {
    hasText: "Users",
  });
  await expect(usersLink).toHaveAttribute("href", `${basePath}/sites/userList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-nav";
  });
  await usersLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/userList`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  await expect(page.locator(".user-list-wrap .listitem")).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-nav");
});

test("site admin post list renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/postList`);

  const updateLink = page.locator('[data-owner="site-post-list-sidebar-link"]', {
    hasText: "Software Update",
  });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator('[data-owner="site-post-list-sidebar-badge"]')).toHaveText("1");
});

test("site admin post list sidebar active state stays on legacy li at pageNum=1", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/postList?pageNum=1`);

  await expect(page.locator('[data-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator('[data-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "border-left-color",
    "rgb(243, 108, 34)",
  );
  expect(await siteSidebarAnchorActiveAttrs(page)).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null, text: "Users" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Posts" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Issues" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Projects" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send email" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Send mass emails" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Software Update" },
    { ariaCurrent: null, className: null, dataStatus: null, text: "Diagnostics" },
  ]);
});

test("site admin post list row links keep legacy hrefs and SPA navigation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/postList`);

  await expect(page.locator('[data-owner="site-post-list-project-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-post-list-project-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-post-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(page.locator('[data-owner="site-post-list-author-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(
    page.locator('[data-owner="site-post-list-metadata-item"]', { hasText: "Alice" }),
  ).toHaveAttribute("href", `${basePath}/alice`);
  await expect(
    page.locator('[data-owner="site-post-list-metadata-item"] > a[href$="#comments"]'),
  ).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7#comments`);

  await expectSpaClick(
    page,
    '[data-owner="site-post-list-project-link"]',
    `${basePath}/acme/roadmap`,
    "site-post-project",
  );
  await expectSpaClick(
    page,
    '[data-owner="site-post-list-title-link"]',
    `${basePath}/acme/roadmap/post/7`,
    "site-post-title",
  );
  await expectSpaClick(
    page,
    '[data-owner="site-post-list-metadata-item"] > a[href$="#comments"]',
    `${basePath}/acme/roadmap/post/7#comments`,
    "site-post-comments",
  );
  await expectSpaClick(
    page,
    '[data-owner="site-post-list-metadata-item"][href]',
    `${basePath}/alice`,
    "site-post-author",
  );
});

test("site admin post list preserves mixed legacy row branches and pagination containment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page, [
    {
      authorAvatarUrl: "https://www.gravatar.com/avatar/bob-custom?s=16&d=retro",
      authorLabel: "Bob Custom",
      authorLoginId: "bob",
      commentCount: 11,
      createdLabel: "2 hours ago",
      createdTitle: new Date(2026, 5, 30, 12, 30).toISOString(),
      ownerName: "acme",
      postNumber: "8",
      projectLogoUrl: "/uploads/project-roadmap.png",
      projectName: "roadmap",
      title: "Custom logo branch",
    },
    {
      authorAvatarUrl: LEGACY_DEFAULT_AUTHOR_AVATAR_URL,
      authorLabel: "Carol",
      authorLoginId: "carol",
      commentCount: 0,
      createdLabel: "Jun 29, 2026",
      createdTitle: "",
      ownerName: "labs",
      postNumber: "9",
      projectLogoUrl: " ",
      projectName: "ops",
      title: "Default artwork branch",
    },
  ]);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/postList`);

  const rows = page.locator(
    '[data-owner="site-post-list-container"] > [data-owner="site-post-list-row"]',
  );
  await expect(rows).toHaveCount(2);
  expect(
    (await sitePostRowDom(page)).map(({ dateText, dateTitle, projectImgSrc, ...row }) => row),
  ).toEqual([
    {
      authorAvatarHeight: "16",
      authorAvatarSrc: "https://www.gravatar.com/avatar/bob-custom?s=16&d=retro",
      authorAvatarWidth: "16",
      authorHref: `${basePath}/bob`,
      authorImgAlt: "Bob Custom",
      authorText: "Bob Custom",
      childClasses: [
        "owner:site-post-list-project-avatar",
        "owner:site-post-list-info",
        "owner:site-post-list-metadata",
      ],
      commentHref: `${basePath}/acme/roadmap/post/8#comments`,
      commentText: "11",
      projectHref: `${basePath}/acme/roadmap`,
      projectImgAlt: "roadmap",
      projectText: "acme/roadmap",
      separatorText: "·",
      titleHref: `${basePath}/acme/roadmap/post/8`,
      titleText: "Custom logo branch",
    },
    {
      authorAvatarHeight: null,
      authorAvatarSrc: LEGACY_DEFAULT_AUTHOR_AVATAR_URL,
      authorAvatarWidth: null,
      authorHref: `${basePath}/carol`,
      authorImgAlt: null,
      authorText: "Carol",
      childClasses: [
        "owner:site-post-list-project-avatar",
        "owner:site-post-list-info",
        "owner:site-post-list-metadata",
      ],
      commentHref: `${basePath}/labs/ops/post/9#comments`,
      commentText: "0",
      projectHref: `${basePath}/labs/ops`,
      projectImgAlt: "ops",
      projectText: "labs/ops",
      separatorText: "·",
      titleHref: `${basePath}/labs/ops/post/9`,
      titleText: "Default artwork branch",
    },
  ]);
  await expect(
    rows.nth(1).locator('[data-owner="site-post-list-metadata-item"][title]'),
  ).toHaveText("Jun 29, 2026");
  await expect(
    rows.nth(1).locator('[data-owner="site-post-list-metadata-item"][title]'),
  ).toHaveAttribute("title", "");
  await expect(
    rows.nth(0).locator('[data-owner="site-post-list-project-avatar-image"]'),
  ).toHaveAttribute("src", "/uploads/project-roadmap.png");

  const metrics = await postListContainmentMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.list.left).toBeGreaterThanOrEqual(metrics!.content.left);
  expect(metrics!.list.right).toBeLessThanOrEqual(metrics!.content.right);
  expect(metrics!.list.bottom).toBeLessThanOrEqual(metrics!.pagination.top);
  expect(metrics!.pagination.left).toBeGreaterThanOrEqual(metrics!.content.left);
  expect(metrics!.pagination.right).toBeLessThanOrEqual(metrics!.content.right);
  expect(metrics!.pagination.top).toBeGreaterThan(metrics!.rows[1].bottom);
  expect(metrics!.pagination.bottom).toBeGreaterThan(metrics!.pagination.top);
  for (const row of metrics!.rows) {
    expect(row.left).toBeGreaterThanOrEqual(metrics!.list.left);
    expect(row.right).toBeLessThanOrEqual(metrics!.list.right);
    expect(row.avatar.right).toBeLessThanOrEqual(row.project.left);
    expect(row.avatar.right).toBeLessThanOrEqual(row.title.left);
    expect(row.avatar.right).toBeLessThanOrEqual(row.author.left);
    expect(row.info.bottom).toBeLessThanOrEqual(row.bottom);
    expect(row.meta.bottom).toBeLessThanOrEqual(row.bottom);
    expect(row.comments.left).toBeGreaterThan(row.date.right);
    expect(row.comments.right).toBeLessThanOrEqual(row.right);
  }
  expect(metrics!.rows[0].bottom).toBeLessThanOrEqual(metrics!.rows[1].top);
});

test("site admin post list custom gravatar author avatar keeps legacy custom attributes", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockPosts(page, {
    authorAvatarUrl: "https://www.gravatar.com/avatar/alice-custom?s=16&d=retro",
    authorLabel: "Alice Custom",
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/postList`);

  const authorAvatar = page.locator('[data-owner="site-post-list-author-avatar-image"]');
  await expect(authorAvatar).toHaveAttribute(
    "src",
    "https://www.gravatar.com/avatar/alice-custom?s=16&d=retro",
  );
  await expect(authorAvatar).toHaveAttribute("alt", "Alice Custom");
  await expect(authorAvatar).toHaveAttribute("width", "16");
  await expect(authorAvatar).toHaveAttribute("height", "16");
});

test("site admin post list falls back to the legacy default project logo when the API returns blank", async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
  });

  await mockSiteAdminSession(page);
  await mockPosts(page, {
    projectLogoUrl: "   ",
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/postList`);

  const projectLogo = page.locator('[data-owner="site-post-list-project-avatar-image"]');
  await expect
    .poll(() =>
      projectLogo.evaluate(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(consoleMessages).not.toEqual(
    expect.arrayContaining([
      expect.stringContaining('An empty string ("") was passed to the src attribute'),
    ]),
  );
});

async function expectSpaClick(page: Page, selector: string, expectedUrl: string, marker: string) {
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/postList`);
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedUrl);
  await page.evaluate((value) => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = value;
  }, marker);
  await page.locator(selector).first().click();
  await expect
    .poll(() => {
      const actual = new URL(page.url());
      return `${actual.pathname}${actual.hash}`;
    })
    .toBe(`${new URL(expectedUrl, page.url()).pathname}${new URL(expectedUrl, page.url()).hash}`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe(marker);
}

async function siteSidebarAnchorActiveAttrs(page: Page) {
  return page.locator('[data-owner="site-post-list-sidebar-link"]').evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: null,
      dataStatus: link.getAttribute("data-status"),
      text: link.textContent?.trim() ?? "",
    })),
  );
}

async function paginationAnchorAttrs(anchor: ReturnType<Page["locator"]>) {
  return anchor.evaluate((link) => ({
    ariaCurrent: link.getAttribute("aria-current"),
    className: link.getAttribute("class"),
    dataStatus: link.getAttribute("data-status"),
    text: link.textContent?.trim() ?? "",
    title: link.getAttribute("title"),
  }));
}

async function sitePostRowDom(page: Page) {
  return page
    .locator('[data-owner="site-post-list-container"] > [data-owner="site-post-list-row"]')
    .evaluateAll((rows) =>
      rows.map((row) => {
        function requireElement<TElement extends Element = Element>(
          root: Element,
          selector: string,
        ) {
          const element = root.querySelector<TElement>(selector);
          if (!element) {
            throw new Error(`Missing ${selector}`);
          }
          return element;
        }

        const directElementChildren = Array.from(row.children);
        const projectLink = requireElement<HTMLAnchorElement>(
          row,
          ':scope > [data-owner="site-post-list-project-avatar"]',
        );
        const projectImage = requireElement<HTMLImageElement>(
          row,
          '[data-owner="site-post-list-project-avatar-image"]',
        );
        const projectNameLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-owner="site-post-list-project-link"]',
        );
        const separator = requireElement(row, '[data-owner="site-post-list-separator"]');
        const titleLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-owner="site-post-list-title-link"]',
        );
        const authorAvatarLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-owner="site-post-list-author-avatar"]',
        );
        const authorImage = requireElement<HTMLImageElement>(
          row,
          '[data-owner="site-post-list-author-avatar-image"]',
        );
        const authorLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-owner="site-post-list-metadata"] > [data-owner="site-post-list-metadata-item"][href]',
        );
        const date = requireElement(
          row,
          '[data-owner="site-post-list-metadata"] > span[data-owner="site-post-list-metadata-item"][title]',
        );
        const comments = requireElement<HTMLAnchorElement>(
          row,
          '[data-owner="site-post-list-metadata"] > span[data-owner="site-post-list-metadata-item"]:not([title]) > a',
        );

        return {
          authorAvatarHeight: authorImage.getAttribute("height"),
          authorAvatarSrc: authorImage.getAttribute("src"),
          authorAvatarWidth: authorImage.getAttribute("width"),
          authorHref: authorAvatarLink.getAttribute("href"),
          authorImgAlt: authorImage.getAttribute("alt"),
          authorText: authorLink.textContent?.trim() ?? "",
          childClasses: directElementChildren.map((child) => {
            const owner = child.getAttribute("data-owner");
            return owner ? `owner:${owner}` : child.getAttribute("class");
          }),
          commentHref: comments.getAttribute("href"),
          commentText: comments.textContent?.replace(/\s+/g, " ").trim() ?? "",
          dateText: date.textContent?.trim() ?? "",
          dateTitle: date.getAttribute("title"),
          projectHref: projectLink.getAttribute("href"),
          projectImgAlt: projectImage.getAttribute("alt"),
          projectImgSrc: projectImage.getAttribute("src"),
          projectText: projectNameLink.textContent?.trim() ?? "",
          separatorText: separator.textContent?.trim() ?? "",
          titleHref: titleLink.getAttribute("href"),
          titleText: titleLink.textContent?.trim() ?? "",
        };
      }),
    );
}

async function postListContainmentMetrics(page: Page) {
  return page.evaluate(() => {
    const content = document.querySelector<HTMLElement>(
      '[data-owner="site-post-list-setting-content-column"]',
    );
    const list = document.querySelector<HTMLElement>('[data-owner="site-post-list-container"]');
    const pagination = document.querySelector<HTMLElement>("#pagination");
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-owner="site-post-list-container"] > [data-owner="site-post-list-row"]',
      ),
    );
    if (!content || !list || !pagination || rows.length === 0) {
      return null;
    }

    return {
      content: rect(content),
      list: rect(list),
      pagination: rect(pagination),
      rows: rows.map((row) => {
        const avatar = requireElement(row, ':scope > [data-owner="site-post-list-project-avatar"]');
        const info = requireElement(row, ':scope > [data-owner="site-post-list-info"]');
        const meta = requireElement(row, ':scope > [data-owner="site-post-list-metadata"]');
        const project = requireElement(row, '[data-owner="site-post-list-project-link"]');
        const title = requireElement(row, '[data-owner="site-post-list-title-link"]');
        const author = requireElement(
          row,
          '[data-owner="site-post-list-metadata"] > [data-owner="site-post-list-metadata-item"][href]',
        );
        const date = requireElement(
          row,
          '[data-owner="site-post-list-metadata"] > span[data-owner="site-post-list-metadata-item"][title]',
        );
        const comments = requireElement(
          row,
          '[data-owner="site-post-list-metadata"] > span[data-owner="site-post-list-metadata-item"]:not([title])',
        );

        return {
          ...rect(row),
          avatar: rect(avatar),
          author: rect(author),
          comments: rect(comments),
          date: rect(date),
          info: rect(info),
          meta: rect(meta),
          project: rect(project),
          title: rect(title),
        };
      }),
    };

    function rect(element: Element) {
      const box = element.getBoundingClientRect();
      return {
        bottom: Math.round(box.bottom),
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
      };
    }

    function requireElement(root: Element, selector: string) {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function mockSiteAdminSession(page: Page) {
  page.clock.setFixedTime(new Date(2026, 5, 30, 15));
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      }),
    });
  });
}

async function mockPosts(
  page: Page,
  postOverrides: Partial<SiteAdminPostFixture> | Array<Partial<SiteAdminPostFixture>> = {},
) {
  const postFixtures = (Array.isArray(postOverrides) ? postOverrides : [postOverrides]).map(
    (overrides) => ({
      ...baseSiteAdminPostFixture(),
      ...overrides,
    }),
  );

  for (const post of postFixtures) {
    await routeFixtureImage(page, post.authorAvatarUrl, 16, 16);
  }

  await page.route("**/api/v1/site/posts?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum =
      Number(url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNum,
        pageSize: 20,
        posts: postFixtures,
        total: Math.max(postFixtures.length, 2),
        totalPages: 2,
      }),
    });
  });
}

function baseSiteAdminPostFixture(): SiteAdminPostFixture {
  return {
    authorAvatarUrl: LEGACY_DEFAULT_AUTHOR_AVATAR_URL,
    authorLabel: "Alice",
    authorLoginId: "alice",
    commentCount: 3,
    createdLabel: "1 day ago",
    createdTitle: new Date(2026, 5, 29, 13).toISOString(),
    labels: [],
    notice: false,
    ownerName: "acme",
    postNumber: "7",
    projectLogoUrl: "",
    projectName: "roadmap",
    readme: false,
    title: "Release checklist",
    updatedLabel: "1 day ago",
  };
}

async function routeFixtureImage(page: Page, imageUrl: string, width: number, height: number) {
  if (!imageUrl.trim()) {
    return;
  }

  await page.route(imageUrl, async (route) => {
    await route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      contentType: "image/svg+xml",
    });
  });
}

type SiteAdminPostFixture = {
  authorAvatarUrl: string;
  authorLabel: string;
  authorLoginId: string;
  commentCount: number;
  createdLabel: string;
  createdTitle: string;
  labels: Array<never>;
  notice: boolean;
  ownerName: string;
  postNumber: string;
  projectLogoUrl: string;
  projectName: string;
  readme: boolean;
  title: string;
  updatedLabel: string;
};

async function mockSiteUsers(page: Page) {
  await page.route("**/api/v1/site/users?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/avatars/siteboss.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Site Boss",
            emailAddress: "siteboss@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: true,
            lastStateModifiedAt: "",
            loginId: "siteboss",
            state: "ACTIVE",
          },
        ],
      }),
    });
  });
}

async function mockUpdate(
  page: Page,
  response: {
    currentVersion: string;
    error: string | null;
    message: string;
    releaseUrl: string | null;
    versionToUpdate: string | null;
  },
) {
  await page.route("**/api/v1/site/update", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function postListMetrics(page: Page) {
  return page.evaluate(() => {
    const row = requireElement('[data-owner="site-post-list-setting-grid"]');
    const sidebar = requireElement('[data-owner="site-post-list-setting-sidebar-column"]');
    const content = requireElement('[data-owner="site-post-list-setting-content-column"]');
    const titleArea = requireElement('[data-owner="site-post-list-title-strip"]');
    const firstRow = requireElement('[data-owner="site-post-list-row"]');
    const avatarWrap = requireElement('[data-owner="site-post-list-project-avatar"]');
    const avatarImage = requireElement('[data-owner="site-post-list-project-avatar-image"]');
    const postInfo = requireElement('[data-owner="site-post-list-info"]');
    const postProject = requireElement('[data-owner="site-post-list-project-link"]');
    const separator = requireElement('[data-owner="site-post-list-separator"]');
    const postTitle = requireElement('[data-owner="site-post-list-title-link"]');
    const meta = requireElement('[data-owner="site-post-list-metadata"]');
    const metaAvatar = requireElement('[data-owner="site-post-list-author-avatar"]');
    const metaItem = requireElement('[data-owner="site-post-list-metadata-item"]');
    const rowRect = row.getBoundingClientRect();
    const firstRowStyle = getComputedStyle(firstRow);
    const avatarWrapStyle = getComputedStyle(avatarWrap);
    const postInfoStyle = getComputedStyle(postInfo);
    const postProjectStyle = getComputedStyle(postProject);
    const separatorStyle = getComputedStyle(separator);
    const postTitleStyle = getComputedStyle(postTitle);
    const metaStyle = getComputedStyle(meta);
    const metaItemStyle = getComputedStyle(metaItem);

    return {
      avatarImageHeight: Math.round(avatarImage.getBoundingClientRect().height),
      avatarImageWidth: Math.round(avatarImage.getBoundingClientRect().width),
      avatarWrapHeight: Math.round(avatarWrap.getBoundingClientRect().height),
      avatarWrapMarginRight: Math.round(parseFloat(avatarWrapStyle.marginRight)),
      avatarWrapMarginTop: Math.round(parseFloat(avatarWrapStyle.marginTop)),
      avatarWrapWidth: Math.round(avatarWrap.getBoundingClientRect().width),
      contentWidthRatio: Number((content.getBoundingClientRect().width / rowRect.width).toFixed(2)),
      firstRowLineHeight: Math.round(parseFloat(firstRowStyle.lineHeight)),
      firstRowPaddingBlock:
        Math.round(parseFloat(firstRowStyle.paddingTop)) +
        Math.round(parseFloat(firstRowStyle.paddingBottom)),
      metaAvatarHeight: Math.round(metaAvatar.getBoundingClientRect().height),
      metaAvatarWidth: Math.round(metaAvatar.getBoundingClientRect().width),
      metaFontSize: Math.round(parseFloat(metaStyle.fontSize)),
      metaItemMarginInline:
        Math.round(parseFloat(metaItemStyle.marginLeft)) +
        Math.round(parseFloat(metaItemStyle.marginRight)),
      metaLineHeight: Math.round(parseFloat(metaStyle.lineHeight)),
      postInfoLineHeight: Math.round(parseFloat(postInfoStyle.lineHeight)),
      postInfoMarginTop: Math.round(parseFloat(postInfoStyle.marginTop)),
      postProjectColor: postProjectStyle.color,
      postProjectDisplay: postProjectStyle.display,
      postProjectFontSize: Math.round(parseFloat(postProjectStyle.fontSize)),
      postProjectFontWeight: postProjectStyle.fontWeight,
      postTitleFontSize: Math.round(parseFloat(postTitleStyle.fontSize)),
      postTitleFontWeight: postTitleStyle.fontWeight,
      separatorFontSize: Math.round(parseFloat(separatorStyle.fontSize)),
      separatorFontWeight: separatorStyle.fontWeight,
      separatorPaddingInline:
        Math.round(parseFloat(separatorStyle.paddingLeft)) +
        Math.round(parseFloat(separatorStyle.paddingRight)),
      sidebarWidthRatio: Number((sidebar.getBoundingClientRect().width / rowRect.width).toFixed(2)),
      titleAreaHeight: Math.round(titleArea.getBoundingClientRect().height),
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
