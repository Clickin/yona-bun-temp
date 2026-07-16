import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const LEGACY_DEFAULT_AUTHOR_AVATAR_URL = "/assets/images/default-avatar-128.png";

const EXPECTED_POST_LIST_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/siteboss">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" title="Site administration" data-toggle="tooltip" data-placement="bottom"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png" alt=""></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <h3>Site management</h3>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="site-setting-wrap">
    <div class="row-fluid">
      <div class="span2">
        <ul>
          <li><a href="__BASE_PATH__/sites/userList">Users</a></li>
          <li><a href="__BASE_PATH__/sites/postList">Posts</a></li>
          <li><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Posts</h2>
        </div>
        <ul class="post-list-wrap">
          <li class="row-fluid listitem">
            <a href="__BASE_PATH__/acme/roadmap" class="avatar-wrap list-avatar">
              <img src="/assets/images/default-project-logo.png" alt="roadmap">
            </a>
            <div class="post-info-wrap">
              <a href="__BASE_PATH__/acme/roadmap" class="post-project">acme/roadmap</a>
              <span class="post-info-separator">·</span>
              <a href="__BASE_PATH__/acme/roadmap/post/7" class="post-title">Release checklist</a>
            </div>
            <div class="post-meta-wrap">
              <a href="__BASE_PATH__/alice" class="avatar-wrap">
                <img src="${LEGACY_DEFAULT_AUTHOR_AVATAR_URL}">
              </a>
              <a href="__BASE_PATH__/alice" class="post-meta-item">Alice</a>
              <span class="post-meta-item" title="2026-06-29 14:30">1 day ago</span>
              <span class="post-comments post-meta-item">
                <a href="__BASE_PATH__/acme/roadmap/post/7#comments"><i class="yobicon-comments"></i>3</a>
              </span>
            </div>
          </li>
        </ul>
        <div id="pagination" class="page-navigation-wrap">
          <ul class="page-nums">
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/postList?pageNum=2"><span>Next page</span><i class="ico btn-pg-next"></i></a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("site admin post list matches legacy site/postList.scala.html populated DOM", async ({
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

  await page.goto(`${basePath}/sites/postList`);
  await expect(page).toHaveTitle("Site settings");
  expect(
    await page
      .locator("head > title")
      .evaluateAll((titles) => titles.map((title) => title.innerHTML)),
  ).toContain("Site settings");
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect.poll(() => new URL(page.url()).search).toBe("");
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"] a[href]')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  expect(
    await page
      .locator('[data-stylex-owner="global-gnb-nav"] a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([basePath, `${basePath}/projects`, "https://github.com/yona-projects/yona/issues"]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="site-post-list-setting-wrap"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-link"]').nth(1)).toHaveText(
    "Posts",
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-link"]')).toHaveText([
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
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
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
    const navbar = document.querySelector("[data-stylex-owner=global-gnb-outer]");
    const searchForm = document.querySelector('form[name="gnb-search-form"]');
    const listAllLink = document.querySelector(
      '[data-stylex-owner="global-gnb-nav"] a[href$="/projects"]',
    );
    const feedbackLink = document.querySelector(
      '[data-stylex-owner="global-gnb-nav"] a[href="https://github.com/yona-projects/yona/issues"]',
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
  const authorAvatarImage = page.locator(
    '[data-stylex-owner="site-post-list-author-avatar-image"]',
  );
  await expect(authorAvatarImage).not.toHaveAttribute("alt", /.*/);
  await expect(authorAvatarImage).not.toHaveAttribute("width", /.*/);
  await expect(authorAvatarImage).not.toHaveAttribute("height", /.*/);
  await expect(page.locator('[data-stylex-owner="site-post-list-row"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="site-post-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(
    page.locator('[data-stylex-owner="site-post-list-metadata-item"] > a[href$="#comments"]'),
  ).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7#comments`);
  await expect(
    page.locator('[data-stylex-owner="site-post-list-sidebar-link"]', {
      hasText: "Send mass emails",
    }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator('[data-stylex-owner="site-post-list-pagination"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="site-post-list-pagination-item"]')).toHaveCount(5);
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

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_POST_LIST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await postListMetrics(page)).toEqual({
    avatarImageHeight: 86,
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
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-link"]').nth(1)).toHaveText(
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
  const usersLink = page.locator('[data-stylex-owner="site-post-list-sidebar-link"]', {
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

  const updateLink = page.locator('[data-stylex-owner="site-post-list-sidebar-link"]', {
    hasText: "Software Update",
  });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator('[data-stylex-owner="site-post-list-sidebar-badge"]')).toHaveText(
    "1",
  );
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

  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-sidebar-item"]').nth(1)).toHaveCSS(
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

  await expect(page.locator('[data-stylex-owner="site-post-list-project-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-project-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(page.locator('[data-stylex-owner="site-post-list-author-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(
    page.locator('[data-stylex-owner="site-post-list-metadata-item"]', { hasText: "Alice" }),
  ).toHaveAttribute("href", `${basePath}/alice`);
  await expect(
    page.locator('[data-stylex-owner="site-post-list-metadata-item"] > a[href$="#comments"]'),
  ).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7#comments`);

  await expectSpaClick(
    page,
    '[data-stylex-owner="site-post-list-project-link"]',
    `${basePath}/acme/roadmap`,
    "site-post-project",
  );
  await expectSpaClick(
    page,
    '[data-stylex-owner="site-post-list-title-link"]',
    `${basePath}/acme/roadmap/post/7`,
    "site-post-title",
  );
  await expectSpaClick(
    page,
    '[data-stylex-owner="site-post-list-metadata-item"] > a[href$="#comments"]',
    `${basePath}/acme/roadmap/post/7#comments`,
    "site-post-comments",
  );
  await expectSpaClick(
    page,
    '[data-stylex-owner="site-post-list-metadata-item"][href]',
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
      createdTitle: "2026-06-30 11:45",
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
      createdTitle: undefined,
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
    '[data-stylex-owner="site-post-list-container"] > [data-stylex-owner="site-post-list-row"]',
  );
  await expect(rows).toHaveCount(2);
  expect(await sitePostRowDom(page)).toEqual([
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
      dateText: "2 hours ago",
      dateTitle: "2026-06-30 11:45",
      projectHref: `${basePath}/acme/roadmap`,
      projectImgAlt: "roadmap",
      projectImgSrc: "/uploads/project-roadmap.png",
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
      dateText: "Jun 29, 2026",
      dateTitle: "Jun 29, 2026",
      projectHref: `${basePath}/labs/ops`,
      projectImgAlt: "ops",
      projectImgSrc: "/assets/images/project_default_logo.png",
      projectText: "labs/ops",
      separatorText: "·",
      titleHref: `${basePath}/labs/ops/post/9`,
      titleText: "Default artwork branch",
    },
  ]);

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

  const authorAvatar = page.locator('[data-stylex-owner="site-post-list-author-avatar-image"]');
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

  const projectLogo = page.locator('[data-stylex-owner="site-post-list-project-avatar-image"]');
  await expect(projectLogo).toHaveAttribute("src", "/assets/images/project_default_logo.png");
  expect(consoleMessages).not.toEqual(
    expect.arrayContaining([
      expect.stringContaining('An empty string ("") was passed to the src attribute'),
    ]),
  );
});

test("site admin post list route source keeps direct typed links", async () => {
  const source = await readFile("src/routes/sites/postList.tsx", "utf8");

  expect(source).not.toContain("createLink");
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("to={item.href}");
  expect(source).not.toContain("prefixBasePath");
  expect(source).not.toMatch(/<a(?:\s|>)/u);
  expect(source).not.toContain("setAttribute");
  expect(source).not.toContain("removeAttribute");
  expect(source).not.toContain("activeProps={{ className: undefined }}");
  expect(source).not.toContain("useLegacySitePostListDocumentTitle");
  expect(source).not.toContain("useEffect");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain('globalThis["document"]');
  expect(source).toContain("showLegacyProjectHeaderLinks");
  expect(source).toContain('<title>{t("title.siteSetting")}</title>');
  expect(source).toContain("const legacyPaginationLinkProps = {");
  expect(source).toContain("function legacyProjectLogoUrl(projectLogoUrl: string)");
  expect(source).toContain(
    'return projectLogoUrl.trim() || "/assets/images/project_default_logo.png";',
  );
  expect(source).toContain("/\\/assets\\/images\\/default-avatar-\\d+\\.png$/u.test(avatarUrl)");
  expect(source).toContain("explicitUndefined: true");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain("className: undefined");
  expect(source).toContain('"data-status": undefined');
  expect(source).toContain("{...legacyPaginationLinkProps}");
  expect(source).not.toContain("pjax-page");
  expect(source).not.toContain("pjaxPage");
  expect(source).not.toContain("data-request");
  expect(source).not.toContain("dangerouslySetInnerHTML");
  expect(source).not.toContain("classList");
  expect(source).not.toContain("style.display");
  expect(source).toContain('to="/sites/postList"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/post/$postNumber"');
  expect(source).toContain('to="/$user"');
  expect(source).toContain('hash="comments"');
  expect(source).toContain("search={{ pageNum: currentPage - 1 }}");
  expect(source).toContain("search={{ pageNum: currentPage + 1 }}");
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
  return page.locator('[data-stylex-owner="site-post-list-sidebar-link"]').evaluateAll((links) =>
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
    .locator(
      '[data-stylex-owner="site-post-list-container"] > [data-stylex-owner="site-post-list-row"]',
    )
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
          ':scope > [data-stylex-owner="site-post-list-project-avatar"]',
        );
        const projectImage = requireElement<HTMLImageElement>(
          row,
          '[data-stylex-owner="site-post-list-project-avatar-image"]',
        );
        const projectNameLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-stylex-owner="site-post-list-project-link"]',
        );
        const separator = requireElement(row, '[data-stylex-owner="site-post-list-separator"]');
        const titleLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-stylex-owner="site-post-list-title-link"]',
        );
        const authorAvatarLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-stylex-owner="site-post-list-author-avatar"]',
        );
        const authorImage = requireElement<HTMLImageElement>(
          row,
          '[data-stylex-owner="site-post-list-author-avatar-image"]',
        );
        const authorLink = requireElement<HTMLAnchorElement>(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > [data-stylex-owner="site-post-list-metadata-item"][href]',
        );
        const date = requireElement(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > span[data-stylex-owner="site-post-list-metadata-item"][title]',
        );
        const comments = requireElement<HTMLAnchorElement>(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > span[data-stylex-owner="site-post-list-metadata-item"]:not([title]) > a',
        );

        return {
          authorAvatarHeight: authorImage.getAttribute("height"),
          authorAvatarSrc: authorImage.getAttribute("src"),
          authorAvatarWidth: authorImage.getAttribute("width"),
          authorHref: authorAvatarLink.getAttribute("href"),
          authorImgAlt: authorImage.getAttribute("alt"),
          authorText: authorLink.textContent?.trim() ?? "",
          childClasses: directElementChildren.map((child) => {
            const owner = child.getAttribute("data-stylex-owner");
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
      '[data-stylex-owner="site-post-list-setting-content-column"]',
    );
    const list = document.querySelector<HTMLElement>(
      '[data-stylex-owner="site-post-list-container"]',
    );
    const pagination = document.querySelector<HTMLElement>("#pagination");
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-stylex-owner="site-post-list-container"] > [data-stylex-owner="site-post-list-row"]',
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
        const avatar = requireElement(
          row,
          ':scope > [data-stylex-owner="site-post-list-project-avatar"]',
        );
        const info = requireElement(row, ':scope > [data-stylex-owner="site-post-list-info"]');
        const meta = requireElement(row, ':scope > [data-stylex-owner="site-post-list-metadata"]');
        const project = requireElement(row, '[data-stylex-owner="site-post-list-project-link"]');
        const title = requireElement(row, '[data-stylex-owner="site-post-list-title-link"]');
        const author = requireElement(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > [data-stylex-owner="site-post-list-metadata-item"][href]',
        );
        const date = requireElement(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > span[data-stylex-owner="site-post-list-metadata-item"][title]',
        );
        const comments = requireElement(
          row,
          '[data-stylex-owner="site-post-list-metadata"] > span[data-stylex-owner="site-post-list-metadata-item"]:not([title])',
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
    createdTitle: "2026-06-29 14:30",
    labels: [],
    notice: false,
    ownerName: "acme",
    postNumber: "7",
    projectLogoUrl: "/assets/images/default-project-logo.png",
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
  createdTitle?: string;
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
    const row = requireElement('[data-stylex-owner="site-post-list-setting-grid"]');
    const sidebar = requireElement('[data-stylex-owner="site-post-list-setting-sidebar-column"]');
    const content = requireElement('[data-stylex-owner="site-post-list-setting-content-column"]');
    const titleArea = requireElement('[data-stylex-owner="site-post-list-title-strip"]');
    const firstRow = requireElement('[data-stylex-owner="site-post-list-row"]');
    const avatarWrap = requireElement('[data-stylex-owner="site-post-list-project-avatar"]');
    const avatarImage = requireElement('[data-stylex-owner="site-post-list-project-avatar-image"]');
    const postInfo = requireElement('[data-stylex-owner="site-post-list-info"]');
    const postProject = requireElement('[data-stylex-owner="site-post-list-project-link"]');
    const separator = requireElement('[data-stylex-owner="site-post-list-separator"]');
    const postTitle = requireElement('[data-stylex-owner="site-post-list-title-link"]');
    const meta = requireElement('[data-stylex-owner="site-post-list-metadata"]');
    const metaAvatar = requireElement('[data-stylex-owner="site-post-list-author-avatar"]');
    const metaItem = requireElement('[data-stylex-owner="site-post-list-metadata-item"]');
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-stylex-owner=global-gnb-outer], [data-stylex-owner=site-post-list-breadcrumb-outer], [data-stylex-owner=site-post-list-page-wrap-outer], [data-stylex-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (
        name === "class" &&
        (current.matches('[data-stylex-owner="global-gnb-inner"]') ||
          current.matches('[data-stylex-owner="global-gnb-outer"]') ||
          current.matches('[data-stylex-owner="site-footer"]') ||
          current.matches('[data-stylex-owner="site-footer-inner"]') ||
          current.matches('[data-stylex-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        new Set([
          "site-post-list-sidebar",
          "site-post-list-breadcrumb-outer",
          "site-post-list-breadcrumb-inner",
          "site-post-list-breadcrumb-heading",
          "site-post-list-page-wrap-outer",
          "site-post-list-setting-wrap",
          "site-post-list-setting-grid",
          "site-post-list-setting-sidebar-column",
          "site-post-list-setting-content-column",
          "site-post-list-sidebar-item",
          "site-post-list-sidebar-link",
          "site-post-list-sidebar-badge",
          "site-post-list-title-strip",
          "site-post-list-title-heading",
          "site-post-list-container",
          "site-post-list-row",
          "site-post-list-project-avatar",
          "site-post-list-project-avatar-image",
          "site-post-list-info",
          "site-post-list-project-link",
          "site-post-list-separator",
          "site-post-list-title-link",
          "site-post-list-metadata",
          "site-post-list-author-avatar",
          "site-post-list-author-avatar-image",
          "site-post-list-metadata-item",
          "site-post-list-comments-icon",
          "site-post-list-pagination",
          "site-post-list-pagination-list",
          "site-post-list-pagination-item",
          "site-post-list-pagination-input",
          "site-post-list-pagination-label",
          "site-post-list-pagination-icon",
        ]).has(current.getAttribute("data-stylex-owner") ?? "")
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => !token.startsWith("x"))
          .join(" ");
      }
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      return value;
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "src",
        "alt",
        "width",
        "height",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((source) => {
    const template = document.createElement("template");
    template.innerHTML = source;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      if (name === "class") {
        const retiredPostListTokens = new Set([
          "title_area",
          "pull-left",
          "post-list-wrap",
          "post-info-wrap",
          "post-project",
          "post-info-separator",
          "post-title",
        ]);
        if (current.matches(".site-breadcrumb-outer")) {
          retiredPostListTokens.add("site-breadcrumb-outer");
        }
        if (current.matches(".site-breadcrumb-inner")) {
          retiredPostListTokens.add("site-breadcrumb-inner");
        }
        if (current.matches(".site-setting-wrap")) retiredPostListTokens.add("site-setting-wrap");
        if (current.matches(".site-setting-wrap > .row-fluid"))
          retiredPostListTokens.add("row-fluid");
        if (current.matches(".site-setting-wrap > .row-fluid > .span2"))
          retiredPostListTokens.add("span2");
        if (current.matches(".site-setting-wrap > .row-fluid > .span10"))
          retiredPostListTokens.add("span10");
        if (
          current.matches(".post-list-wrap > .listitem") ||
          current.matches(".post-list-wrap > .listitem > .avatar-wrap.list-avatar")
        ) {
          retiredPostListTokens.add("row-fluid");
          retiredPostListTokens.add("listitem");
          retiredPostListTokens.add("avatar-wrap");
          retiredPostListTokens.add("list-avatar");
        }
        if (current.matches(".page-wrap-outer")) retiredPostListTokens.add("page-wrap-outer");
        if (current.matches(".post-meta-wrap")) {
          retiredPostListTokens.add("post-meta-wrap");
        }
        if (current.matches(".post-meta-wrap > .avatar-wrap")) {
          retiredPostListTokens.add("avatar-wrap");
        }
        if (current.matches(".post-meta-wrap > .post-meta-item")) {
          retiredPostListTokens.add("post-meta-item");
          retiredPostListTokens.add("post-comments");
        }
        if (current.matches(".post-meta-wrap > .post-comments > a > i.yobicon-comments")) {
          retiredPostListTokens.add("yobicon-comments");
        }
        if (current.matches("#pagination.page-navigation-wrap")) {
          retiredPostListTokens.add("page-navigation-wrap");
        }
        if (current.matches("#pagination > .page-nums")) {
          retiredPostListTokens.add("page-nums");
        }
        if (current.matches("#pagination > .page-nums > .page-num")) {
          retiredPostListTokens.add("page-num");
          retiredPostListTokens.add("ikon");
          retiredPostListTokens.add("delimiter");
        }
        if (current.matches("#pagination > .page-nums > .page-num.ikon i.ico")) {
          retiredPostListTokens.add("ico");
          retiredPostListTokens.add("btn-pg-prev");
          retiredPostListTokens.add("btn-pg-next");
          retiredPostListTokens.add("off");
        }
        if (current.matches('#pagination input[name="pageNum"]')) {
          retiredPostListTokens.add("input-mini");
          retiredPostListTokens.add("nospinner");
        }
        if (current.matches("#pagination span.off")) {
          retiredPostListTokens.add("off");
        }
        if (value.split(/\s+/u).some((token) => retiredPostListTokens.has(token))) {
          return value
            .split(/\s+/u)
            .filter((token) => !retiredPostListTokens.has(token))
            .join(" ");
        }
      }
      const isSiteLayoutHeader =
        name === "class" &&
        value.split(/\s+/u).includes("gnb-outer") &&
        current.matches("header.gnb-outer") &&
        current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
      const isSiteLayoutFooterOuter =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer-outer") &&
        current.matches("footer.page-footer-outer") &&
        current.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer") &&
        current.matches("footer.page-footer-outer > div.page-footer") &&
        current.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        name === "class" &&
        value.split(/\s+/u).includes("provider") &&
        current.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : name === "class" &&
                    value.split(/\s+/u).includes("gnb-inner") &&
                    current.matches("header.gnb-outer > div.gnb-inner") &&
                    current.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : name === "class" &&
                      value.split(/\s+/u).includes("gnb-nav") &&
                      current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
      }
      return value;
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "src",
        "alt",
        "width",
        "height",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "role",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  }, html);
}
