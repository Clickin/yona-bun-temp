import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ISSUE_LIST_SCREEN = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
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
          <li class=""><a href="__BASE_PATH__/sites/postList">Posts</a></li>
          <li class="active"><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li class=""><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li class=""><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li class=""><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li class=""><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li class=""><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Issues</h2>
        </div>
        <ul class="nav nav-tabs">
          <li class="active"><a href="__BASE_PATH__/sites/issueList?state=open">Open</a></li>
          <li class=""><a href="__BASE_PATH__/sites/issueList?state=closed">Closed</a></li>
        </ul>
        <ul class="post-list-wrap">
          <li class="row-fluid listitem">
            <a href="__BASE_PATH__/acme/roadmap" class="avatar-wrap list-avatar">
              <img src="/assets/images/default-project-logo.png" alt="roadmap">
            </a>
            <div class="post-info-wrap">
              <a href="__BASE_PATH__/acme/roadmap" class="post-project">acme/roadmap</a>
              <span class="post-info-separator">·</span>
              <a href="__BASE_PATH__/acme/roadmap/issue/42" class="post-title">Fix release blocker</a>
            </div>
            <div class="post-meta-wrap">
              <a href="__BASE_PATH__/alice" class="avatar-wrap">
                <img src="https://www.gravatar.com/avatar/alice-default?s=16">
              </a>
              <a href="__BASE_PATH__/alice" class="post-meta-item">Alice</a>
              <span class="post-meta-item" title="2026-06-29 13:00">1 day ago</span>
              <span class="post-comments post-meta-item">
                <a href="__BASE_PATH__/acme/roadmap/issue/42#comments"><i class="yobicon-comments"></i>5</a>
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
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/issueList?pageNum=2&amp;state=open" pjax-page=""><span>Next page</span><i class="ico btn-pg-next"></i></a></li>
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

test("site admin issue list matches legacy site/issueList.scala.html open populated DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockIssues(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList`);
  await expect(page).toHaveTitle("Site settings");
  await expect
    .poll(() => new URL(page.url()).pathname + new URL(page.url()).search)
    .toBe(`${basePath}/sites/issueList`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Y", "List All", "Feedback"]);
  await expect(
    page
      .locator(".gnb-nav > li > a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).resolves.toEqual([
    `${basePath}`,
    `${basePath}/projects`,
    "https://github.com/yona-projects/yona/issues",
  ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Issues");
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
  await expect(
    page
      .locator(".site-setting-nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).resolves.toEqual([
    `${basePath}/sites/userList`,
    `${basePath}/sites/postList`,
    `${basePath}/sites/issueList`,
    `${basePath}/sites/projectList`,
    `${basePath}/sites/mail`,
    `${basePath}/sites/massmail`,
    `${basePath}/sites/update`,
    `${basePath}/sites/diagnostic`,
  ]);
  await expect(page.locator(".site-setting-nav li").nth(2)).toHaveClass("active");
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  await expect(page.locator(".span10 > .nav.nav-tabs li.active a")).toHaveText("Open");
  await expect(page.locator(".span10 > .nav.nav-tabs li.active a")).toHaveAttribute(
    "href",
    `${basePath}/sites/issueList?state=open`,
  );
  await expect(page.locator(".span10 > .nav.nav-tabs li").first()).toHaveClass("active");
  await expect(page.locator(".span10 > .nav.nav-tabs li").nth(1)).toHaveClass("");
  await expect(page.locator(".span10 > .nav.nav-tabs a")).toHaveText(["Open", "Closed"]);
  expect(await legacyLinkSnapshot(page, ".span10 > .nav.nav-tabs a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList?state=open`,
      pjaxPage: null,
      text: "Open",
      title: null,
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList?state=closed`,
      pjaxPage: null,
      text: "Closed",
      title: null,
    },
  ]);
  const closedTab = page.getByRole("link", { exact: true, name: "Closed" });
  await expect(closedTab).toHaveAttribute("href", `${basePath}/sites/issueList?state=closed`);
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".list-avatar")).toHaveAttribute("href", `${basePath}/acme/roadmap`);
  await expect(page.locator(".post-project")).toHaveAttribute("href", `${basePath}/acme/roadmap`);
  await expect(page.locator(".post-title")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/issue/42`,
  );
  await expect(page.locator(".post-meta-wrap > .avatar-wrap")).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.locator(".post-meta-wrap > .post-meta-item").first()).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute("alt", /.*/);
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute("width", /.*/);
  await expect(page.locator(".post-meta-wrap .avatar-wrap img")).not.toHaveAttribute(
    "height",
    /.*/,
  );
  await expect(page.locator(".post-comments a")).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/issue/42#comments`,
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
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/issueList?pageNum=2&state=open`,
  );
  await expect(nextPageLink).toHaveAttribute("pjax-page", "");
  expect(await legacyLinkSnapshot(page, "#pagination a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList?pageNum=2&state=open`,
      pjaxPage: "",
      text: "Next page",
      title: null,
    },
  ]);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_ISSUE_LIST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await legacyGnbMetrics(page)).toEqual({
    feedbackLeftGap: 11,
    gnbHeight: 40,
    hasScopedSearchTitle: false,
    searchBottomWithinNavbar: true,
    searchLeftOfUsermenu: true,
    searchTopWithinNavbar: true,
  });
  expect(await issueListMetrics(page)).toEqual({
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
    tabHeight: 38,
    titleAreaHeight: 39,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-issues-pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("open");
  await expect(page.locator(".span10 > .nav.nav-tabs li.active a")).toHaveText("Open");
  const previousPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  await expect(previousPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/issueList?pageNum=1&state=open`,
  );
  expect(await legacyLinkSnapshot(page, "#pagination a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList?pageNum=1&state=open`,
      pjaxPage: "",
      text: "Previous page",
      title: null,
    },
  ]);
  await page.locator('#pagination input[name="pageNum"]').fill("1");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-issues-pagination");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-issues-tabs";
  });
  await closedTab.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("closed");
  await expect(page.locator(".span10 > .nav.nav-tabs li.active a")).toHaveText("Closed");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-issues-tabs");

  await mockPosts(page);
  const postsLink = page.locator(".site-setting-nav a", { hasText: "Posts" });
  await expect(postsLink).toHaveAttribute("href", `${basePath}/sites/postList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-posts-nav";
  });
  await postsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Posts");
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-nav");

  const routeSource = readFileSync("src/routes/sites/issueList.tsx", "utf8");
  expect(routeSource).toContain("function useLegacySiteIssueListDocumentTitle");
  expect(routeSource).toContain('document.title = t("title.siteSetting")');
  expect(routeSource).toContain(
    "<SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>",
  );
  expect(routeSource).toContain("const legacyIssueListLinkProps = {");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("<a");
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).not.toContain("projectPath");
  expect(routeSource).not.toContain("issuePath");
  expect(routeSource).not.toContain("authorPath");
  expect(routeSource).not.toContain("to={item.href}");
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('pjax-page=""');
});

test("site admin issue list renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockIssues(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/issueList?state=open`);

  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
});

test("site admin issue list falls back to the legacy default project logo for blank logo URLs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await mockSiteAdminSession(page);
  await mockIssues(page, {
    projectLogoUrl: "",
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=open`);

  await expect(page.locator(".post-list-wrap .list-avatar img")).toHaveAttribute(
    "src",
    "/assets/images/project_default_logo.png",
  );
  await expect(page.locator('.post-list-wrap .list-avatar img[src=""]')).toHaveCount(0);
  expect(
    consoleErrors.find((message) =>
      message.includes('An empty string ("") was passed to the src attribute'),
    ),
  ).toBeUndefined();
});

test("site admin issue list custom author avatar alt uses legacy user name", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockIssuesWithCustomAuthorAvatar(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=open`);

  const authorAvatar = page.locator(".post-meta-wrap > .avatar-wrap img");
  await expect(authorAvatar).toHaveAttribute("src", "/avatars/alice-custom.png");
  await expect(authorAvatar).toHaveAttribute("alt", "Alice Legal Name");
  await expect(authorAvatar).toHaveAttribute("width", "16");
  await expect(authorAvatar).toHaveAttribute("height", "16");
  await expect(page.locator(".post-meta-wrap > .post-meta-item").first()).toHaveText(
    "Alice Display",
  );
});

test("site admin issue list resets decimal pagination input without navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockIssues(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=open&pageNum=2`);
  const pageInput = page.locator('#pagination input[name="pageNum"]');
  await expect(pageInput).toHaveValue("2");

  const initialUrl = page.url();
  await pageInput.fill("1.5");
  await pageInput.press("Enter");

  await expect(pageInput).toHaveValue("2");
  expect(page.url()).toBe(initialUrl);
  expect(new URL(page.url()).searchParams.get("pageNum")).toBe("2");
});

test("site admin issue list pagination preserves existing query params like legacy yobi.Pagination", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockIssues(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=open&from=legacy`);
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect
    .poll(async () =>
      new URL((await nextPageLink.getAttribute("href")) ?? "", "http://yona.test").searchParams.get(
        "from",
      ),
    )
    .toBe("legacy");

  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("from")).toBe("legacy");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");

  await page.locator('#pagination input[name="pageNum"]').fill("1");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("from")).toBe("legacy");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
});

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

async function mockIssues(page: Page, overrides: { projectLogoUrl?: string } = {}) {
  await page.route("https://www.gravatar.com/avatar/alice-default?s=16", async (route) => {
    await route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
      contentType: "image/svg+xml",
    });
  });

  await page.route("**/api/v1/site/issues?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum =
      Number(url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issues: [
          {
            assigneeLabel: "",
            authorAvatarUrl: "https://www.gravatar.com/avatar/alice-default?s=16",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 13:00",
            issueNumber: "42",
            labels: [],
            milestoneTitle: "",
            ownerName: "acme",
            projectLogoUrl: overrides.projectLogoUrl ?? "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
            updatedLabel: "1 day ago",
            voterCount: 0,
            watcherCount: 0,
          },
        ],
        page: pageNum,
        pageSize: 20,
        state: "open",
        total: 2,
        totalPages: 2,
      }),
    });
  });
}

async function mockIssuesWithCustomAuthorAvatar(page: Page) {
  await page.route("**/api/v1/site/issues?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issues: [
          {
            assigneeLabel: "",
            authorAvatarUrl: "/avatars/alice-custom.png",
            authorLabel: "Alice Display",
            authorLoginId: "alice",
            authorName: "Alice Legal Name",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 13:00",
            issueNumber: "42",
            labels: [],
            milestoneTitle: "",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
            updatedLabel: "1 day ago",
            voterCount: 0,
            watcherCount: 0,
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      }),
    });
  });
}

async function mockPosts(page: Page) {
  await page.route("**/api/v1/site/posts?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/avatars/alice.png",
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
        total: 1,
        totalPages: 1,
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

async function siteSettingNavActiveMarkerLeaks(page: Page) {
  return page.locator(".site-setting-nav a").evaluateAll((links) =>
    links.flatMap((link) => {
      const leaked = ["class", "aria-current", "data-status"].filter((name) =>
        link.hasAttribute(name),
      );
      return leaked.map((name) => `${link.textContent?.trim() ?? ""}:${name}`);
    }),
  );
}

async function legacyLinkSnapshot(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      href: link.getAttribute("href"),
      pjaxPage: link.getAttribute("pjax-page"),
      text: link.textContent?.trim() ?? "",
      title: link.getAttribute("title"),
    })),
  );
}

async function issueListMetrics(page: Page) {
  return page.evaluate(() => {
    const row = requireElement(".site-setting-wrap > .row-fluid");
    const sidebar = requireElement(".site-setting-wrap > .row-fluid > .span2");
    const content = requireElement(".site-setting-wrap > .row-fluid > .span10");
    const titleArea = requireElement(".title_area");
    const tabs = requireElement(".span10 > .nav.nav-tabs");
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
      tabHeight: Math.round(tabs.getBoundingClientRect().height),
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

async function legacyGnbMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement(".gnb-outer");
    const gnbInner = requireElement(".gnb-inner");
    const search = requireElement('form[name="gnb-search-form"]');
    const feedbackLink = requireElement(
      '.gnb-nav > li > a[href="https://github.com/yona-projects/yona/issues"]',
    );
    const listAllLink = requireElement('.gnb-nav > li > a[href$="/projects"]');
    const userMenu = requireElement(".gnb-usermenu");
    const navbarRect = navbar.getBoundingClientRect();
    const gnbInnerRect = gnbInner.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    const feedbackRect = feedbackLink.getBoundingClientRect();
    const listAllRect = listAllLink.getBoundingClientRect();
    const userMenuRect = userMenu.getBoundingClientRect();

    return {
      feedbackLeftGap: Math.round(feedbackRect.left - listAllRect.right),
      gnbHeight: Math.round(navbarRect.height),
      hasScopedSearchTitle: Boolean(document.querySelector("#gnb-search-scope-title")),
      searchBottomWithinNavbar: searchRect.bottom <= gnbInnerRect.bottom,
      searchLeftOfUsermenu: searchRect.right <= userMenuRect.left,
      searchTopWithinNavbar: searchRect.top >= gnbInnerRect.top,
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
