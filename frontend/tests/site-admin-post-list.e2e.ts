import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

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
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
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
        <ul class="site-setting-nav">
          <li class=""><a href="__BASE_PATH__/sites/userList">Users</a></li>
          <li class="active"><a href="__BASE_PATH__/sites/postList">Posts</a></li>
          <li class=""><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li class=""><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li class=""><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class=""><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
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
                <img src="https://www.gravatar.com/avatar/alice-default?s=16">
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
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">PREV</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/postList?pageNum=2"><span>NEXT</span><i class="ico btn-pg-next"></i></a></li>
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
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Posts");
  await expect(page.locator(".site-setting-nav a")).toHaveText([
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
  await expect(page.locator(".site-setting-nav li").nth(1)).toHaveClass("active");
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute("width", /.*/);
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute(
    "height",
    /.*/,
  );
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".post-title")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(page.locator(".post-comments a")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7#comments`,
  );
  await expect(
    page.locator(".site-setting-nav a", { hasText: "Send mass emails" }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator("#pagination")).toHaveClass("page-navigation-wrap");
  await expect(page.locator("#pagination .page-nums .page-num")).toHaveCount(5);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "NEXT" });
  await expect(nextPageLink).toHaveAttribute("href", `${basePath}/sites/postList?pageNum=2`);
  await expect(nextPageLink).not.toHaveAttribute("pjax-page", "");

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
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Posts");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  const previousPageLink = page.locator("#pagination a", { hasText: "PREV" });
  await expect(previousPageLink).toHaveAttribute("href", `${basePath}/sites/postList?pageNum=1`);
  await expect(previousPageLink).not.toHaveAttribute("pjax-page", "");
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
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-pagination-input");

  await mockSiteUsers(page);
  const usersLink = page.locator(".site-setting-nav a", { hasText: "Users" });
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

  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
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

  await expect(page.locator(".post-list-wrap .list-avatar")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator(".post-project")).toHaveAttribute("href", `${basePath}/acme/roadmap`);
  await expect(page.locator(".post-title")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7`,
  );
  await expect(page.locator(".post-meta-wrap > .avatar-wrap")).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.locator(".post-meta-item", { hasText: "Alice" })).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.locator(".post-comments a")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/post/7#comments`,
  );

  await expectSpaClick(page, ".post-project", `${basePath}/acme/roadmap`, "site-post-project");
  await expectSpaClick(page, ".post-title", `${basePath}/acme/roadmap/post/7`, "site-post-title");
  await expectSpaClick(
    page,
    ".post-comments a",
    `${basePath}/acme/roadmap/post/7#comments`,
    "site-post-comments",
  );
  await expectSpaClick(page, ".post-meta-item", `${basePath}/alice`, "site-post-author");
});

test("site admin post list route source keeps direct typed links", async () => {
  const source = await readFile("src/routes/sites/postList.tsx", "utf8");

  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("to={item.href}");
  expect(source).not.toContain("prefixBasePath");
  expect(source).not.toContain("<a href={");
  expect(source).not.toContain('"pjax-page": ""');
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

async function mockPosts(page: Page) {
  await page.route("https://www.gravatar.com/avatar/alice-default?s=16", async (route) => {
    await route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
      contentType: "image/svg+xml",
    });
  });

  await page.route("**/api/v1/site/posts?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum =
      Number(url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNum,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "https://www.gravatar.com/avatar/alice-default?s=16",
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
          },
        ],
        total: 2,
        totalPages: 2,
      }),
    });
  });
}

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
    const row = requireElement(".site-setting-wrap > .row-fluid");
    const sidebar = requireElement(".site-setting-wrap > .row-fluid > .span2");
    const content = requireElement(".site-setting-wrap > .row-fluid > .span10");
    const titleArea = requireElement(".title_area");
    const firstRow = requireElement(".post-list-wrap .listitem");
    const avatarWrap = requireElement(".post-list-wrap .list-avatar");
    const avatarImage = requireElement(".post-list-wrap .list-avatar img");
    const postInfo = requireElement(".post-info-wrap");
    const postProject = requireElement(".post-project");
    const separator = requireElement(".post-info-separator");
    const postTitle = requireElement(".post-title");
    const meta = requireElement(".post-meta-wrap");
    const metaAvatar = requireElement(".post-meta-wrap .avatar-wrap");
    const metaItem = requireElement(".post-meta-item");
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
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");

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
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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
