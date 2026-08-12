import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_ISSUE_LIST_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button class="pin" type="button" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content"><div id="myOrganizationList" class="tab-pane user-project-list active"><div class="search-result"><div class="group"><input class="search-input org-search" type="text" value="" autocomplete="off"></input><span class="bar"></span></div><div id="organizations" class="no-result tab-pane user-ul">No results</div></div></div><div id="myProjectList" class="tab-pane user-project-list"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input id="query" class="search-input project-search" type="text" value="" autocomplete="off"></input><span class="bar"></span></div><div class="subtab-wrap subtab-group"><ul class="nav-subtab unstyled"><li class="active"><button type="button">Recently visited</button></li><li><button type="button">Create</button></li><li><button type="button">Watching</button></li><li><button type="button">Member</button></li></ul></div><div class="tab-content"><div id="recentlyVisited" class="no-result tab-pane user-ul active">No results</div><div id="watching" class="no-result tab-pane user-ul">No results</div><div id="createdByMe" class="no-result tab-pane user-ul">No results</div><div id="joinmember" class="no-result tab-pane user-ul">No results</div></div></div></div></div></div><div id="myRecentIssueList" class="tab-pane user-project-list"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input id="recent-issue-query" class="search-input project-search" type="text" value="" autocomplete="off"></input><span class="bar"></span></div><div class="tab-content"><div id="recentlyVisitedIssues" class="no-result tab-pane user-ul active">No results</div></div></div></div></div></div></div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" title="Site administration" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png" alt=""></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn"><i class="yobicon-plus"></i><span class="caret"></span></button>
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
          <li class="active"><a href="__BASE_PATH__/sites/issueList">Issues</a></li>
          <li><a href="__BASE_PATH__/sites/projectList">Projects</a></li>
          <li><a href="__BASE_PATH__/sites/mail">Send email</a></li>
          <li><a href="__BASE_PATH__/sites/massmail">Send mass emails</a></li>
          <li><a href="__BASE_PATH__/sites/update">Software Update</a></li>
          <li><a href="__BASE_PATH__/sites/diagnostic">Diagnostics</a></li>
        </ul>
      </div>
      <div class="span10">
        <div class="title_area">
          <h2 class="pull-left">Issues</h2>
        </div>
        <ul>
          <li><a href="__BASE_PATH__/sites/issueList?state=open">Open</a></li>
          <li><a href="__BASE_PATH__/sites/issueList?state=closed">Closed</a></li>
        </ul>
        <ul class="post-list-wrap">
          <li class="row-fluid listitem">
            <a href="__BASE_PATH__/acme/roadmap">
              <img src="/assets/images/default-project-logo.png" alt="roadmap">
            </a>
            <div class="post-info-wrap">
              <a href="__BASE_PATH__/acme/roadmap" class="post-project">acme/roadmap</a>
              <span class="post-info-separator">·</span>
              <a href="__BASE_PATH__/acme/roadmap/issue/42" class="post-title">Fix release blocker</a>
            </div>
            <div>
              <a href="__BASE_PATH__/alice">
                <img src="https://www.gravatar.com/avatar/alice-default?s=16">
              </a>
              <a href="__BASE_PATH__/alice">Alice</a>
              <span title="2026-06-29 13:00">1 day ago</span>
              <span>
                <a href="__BASE_PATH__/acme/roadmap/issue/42#comments"><i class="yobicon-comments"></i>5</a>
              </span>
            </div>
          </li>
        </ul>
        <div id="pagination">
          <ul>
            <li><i></i><span>Previous page</span></li>
            <li><input name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li>/</li>
            <li>2</li>
            <li><a href="__BASE_PATH__/sites/issueList?pageNum=2&amp;state=open"><span>Next page</span><i></i></a></li>
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
    .poll(() =>
      page
        .locator("head > title")
        .first()
        .evaluate((title) => title.textContent),
    )
    .toBe("Site settings");
  await expect
    .poll(() => new URL(page.url()).pathname + new URL(page.url()).search)
    .toBe(`${basePath}/sites/issueList`);
  await expect(page.locator('[data-owner="site-issue-list-setting-wrap"]')).toBeVisible();
  await expect(page.locator('[data-owner="global-gnb-nav"] > li > a')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  await expect(
    page
      .locator('[data-owner="global-gnb-nav"] > li > a')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).resolves.toEqual([
    `${basePath}/`,
    `${basePath}/projects`,
    "https://github.com/yona-projects/yona/issues",
  ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator('[data-owner="site-issue-list-sidebar-link"]').nth(2)).toHaveText(
    "Issues",
  );
  await expect(page.locator('[data-owner="site-issue-list-sidebar-link"]')).toHaveText([
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
      .locator('[data-owner="site-issue-list-sidebar-link"]')
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
  await expect(page.locator('[data-owner="site-issue-list-sidebar-item"]').nth(2)).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(page.locator('[data-owner="site-issue-list-sidebar-item"]').nth(2)).toHaveCSS(
    "border-left-color",
    "rgb(243, 108, 34)",
  );
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  expect(
    await legacyLinkSnapshot(
      page,
      '[data-owner="site-issue-list-sidebar-item"]:nth-child(3) > [data-owner="site-issue-list-sidebar-link"]',
    ),
  ).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList`,
      pjaxPage: null,
      text: "Issues",
      title: null,
    },
  ]);
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText("Open");
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveAttribute("href", `${basePath}/sites/issueList?state=open`);
  const openStateItems = page.locator(
    '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"]',
  );
  await expect(openStateItems.first()).toHaveAttribute("data-selected", "true");
  await expect(openStateItems.nth(1)).toHaveAttribute("data-selected", "false");
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText(["Open", "Closed"]);
  expect(
    await legacyLinkSnapshot(
      page,
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toEqual([
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
  await expect(page.locator('[data-owner="site-issue-list-row"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="site-issue-list-project-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-issue-list-project-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap`,
  );
  await expect(page.locator('[data-owner="site-issue-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/issue/42`,
  );
  await expect(page.locator('[data-owner="site-issue-list-author-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(
    page.locator('[data-owner="site-issue-list-metadata-item"]').first(),
  ).toHaveAttribute("href", `${basePath}/alice`);
  await expect(
    page.locator('[data-owner="site-issue-list-author-avatar-image"]'),
  ).not.toHaveAttribute("alt", /.*/);
  await expect(
    page.locator('[data-owner="site-issue-list-author-avatar-image"]'),
  ).not.toHaveAttribute("width", /.*/);
  await expect(
    page.locator('[data-owner="site-issue-list-author-avatar-image"]'),
  ).not.toHaveAttribute("height", /.*/);
  await expect(page.locator('[data-owner="site-issue-list-metadata-item"] a')).toHaveAttribute(
    "href",
    `${basePath}/acme/roadmap/issue/42#comments`,
  );
  await expect(
    page.locator('[data-owner="site-issue-list-sidebar-link"]', {
      hasText: "Send mass emails",
    }),
  ).toHaveAttribute("href", `${basePath}/sites/massmail`);
  await expect(page.locator('[data-owner="site-issue-list-pagination"]')).not.toHaveClass(
    /\bpage-navigation-wrap\b/u,
  );
  await expect(page.locator('[data-owner="site-issue-list-pagination-item"]')).toHaveCount(5);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/issueList?pageNum=2&state=open`,
  );
  await expect(nextPageLink).not.toHaveAttribute("pjax-page", "");
  expect(await legacyLinkSnapshot(page, "#pagination a")).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/sites/issueList?pageNum=2&state=open`,
      pjaxPage: null,
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
    // F5 dist-truth: `|` divider glyph at 12px/40px (legacy _page.less:240-250 divider ::after) measures 3px gap; pin 11 was stale.
    feedbackLeftGap: 3,
    gnbHeight: 40,
    hasScopedSearchTitle: false,
    searchBottomWithinNavbar: true,
    searchLeftOfUsermenu: true,
    searchTopWithinNavbar: true,
  });
  expect(await issueListMetrics(page)).toEqual({
    avatarImageHeight: 86,
    // F5 dist-truth: logo 404s in harness → Chrome sizes the broken img box from alt text (54x86);
    // legacy .avatar-wrap img {width:100%} (_yobiUI.less:440) is equally ignored for broken images.
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
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText("Open");
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
      pjaxPage: null,
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
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText("Closed");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-issues-tabs");

  await mockPosts(page);
  const postsLink = page.locator('[data-owner="site-issue-list-sidebar-link"]', {
    hasText: "Posts",
  });
  await expect(postsLink).toHaveAttribute("href", `${basePath}/sites/postList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-posts-nav";
  });
  await postsLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/postList`);
  await expect(page.locator('[data-owner="site-post-list-sidebar-link"]').nth(1)).toHaveText(
    "Posts",
  );
  await expect(page.locator('[data-owner="site-post-list-row"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-posts-nav");

  const routeSource = readFileSync("src/routes/sites/issueList.tsx", "utf8");
  expect(routeSource).toContain('<title>{t("title.siteSetting")}</title>');
  expect(routeSource).not.toContain("useLegacySiteIssueListDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain('globalThis["document"]');
  expect(routeSource).toContain(
    "<SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>",
  );
  expect(routeSource).toContain("const legacyIssueListLinkProps = {");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain("normalizeLegacyIssueStateSearch(search.state)");
  expect(routeSource).toContain('state.trim() === ""');
  expect(routeSource).not.toContain(
    'state: search.state === "open" || search.state === "closed" ? search.state : undefined',
  );
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
  expect(routeSource).not.toContain('"data-status": undefined');
  expect(routeSource).not.toContain("data-status={undefined}");
  expect(routeSource).not.toContain("pjax-page");
  expect(routeSource).not.toContain("pjaxPage");
});

test("site admin issue list renders legacy closed issue rows with closed pagination state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const issueRequests = await mockIssues(page, {
    authorAvatarUrl: "/avatars/closed-author.png",
    authorLabel: "Bob Display",
    authorLoginId: "bob",
    authorName: "Bob Legal Name",
    commentCount: 8,
    createdLabel: "2 days ago",
    createdTitle: "2026-06-28 09:15",
    issueNumber: "77",
    ownerName: "beta",
    projectLogoUrl: "/logos/closed-roadmap.png",
    projectName: "archive",
    state: "closed",
    title: "Close archived task",
    totalPages: 3,
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=closed&pageNum=1`);

  await expect.poll(() => issueRequests).toEqual([{ page: "1", state: "closed" }]);
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText("Closed");
  const closedStateItems = page.locator(
    '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"]',
  );
  await expect(closedStateItems.first()).toHaveAttribute("data-selected", "false");
  await expect(closedStateItems.nth(1)).toHaveAttribute("data-selected", "true");
  expect(
    await legacyLinkSnapshot(
      page,
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toEqual([
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

  const row = page.locator('[data-owner="site-issue-list-row"]');
  await expect(row).toHaveCount(1);
  const projectAvatar = row.locator('[data-owner="site-issue-list-project-avatar"]');
  await expect(projectAvatar).toHaveAttribute("href", `${basePath}/beta/archive`);
  await expect(projectAvatar.locator("img")).toHaveAttribute("src", "/logos/closed-roadmap.png");
  await expect(projectAvatar.locator("img")).toHaveAttribute("alt", "archive");
  await expect(row.locator('[data-owner="site-issue-list-project-link"]')).toHaveAttribute(
    "href",
    `${basePath}/beta/archive`,
  );
  await expect(row.locator('[data-owner="site-issue-list-project-link"]')).toHaveText(
    "beta/archive",
  );
  await expect(row.locator('[data-owner="site-issue-list-title-link"]')).toHaveAttribute(
    "href",
    `${basePath}/beta/archive/issue/77`,
  );
  await expect(row.locator('[data-owner="site-issue-list-title-link"]')).toHaveText(
    "Close archived task",
  );
  await expect(row.locator('[data-owner="site-issue-list-author-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/bob`,
  );
  await expect(row.locator('[data-owner="site-issue-list-author-avatar-image"]')).toHaveAttribute(
    "src",
    "/avatars/closed-author.png",
  );
  await expect(row.locator('[data-owner="site-issue-list-author-avatar-image"]')).toHaveAttribute(
    "alt",
    "Bob Legal Name",
  );
  await expect(row.locator('[data-owner="site-issue-list-author-avatar-image"]')).toHaveAttribute(
    "width",
    "16",
  );
  await expect(row.locator('[data-owner="site-issue-list-author-avatar-image"]')).toHaveAttribute(
    "height",
    "16",
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"]').first()).toHaveAttribute(
    "href",
    `${basePath}/bob`,
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"]').first()).toHaveText(
    "Bob Display",
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"]').nth(1)).toHaveAttribute(
    "title",
    "2026-06-28 09:15",
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"]').nth(1)).toHaveText(
    "2 days ago",
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"] a')).toHaveAttribute(
    "href",
    `${basePath}/beta/archive/issue/77#comments`,
  );
  await expect(row.locator('[data-owner="site-issue-list-metadata-item"] a')).toHaveText("8");
  const commentsIcon = row.locator('[data-owner="site-issue-list-comments-icon"]');
  await expect(commentsIcon).toHaveCount(1);
  // F5 dist-truth (2026-08-11): the comments icon owns the legacy yobicon-comments
  // class (route-level parity contract; see canonicalizeScreenRoots)
  await expect(commentsIcon).toHaveClass(/\byobicon-comments\b/u);

  await expect(page.locator('[data-owner="site-issue-list-pagination"]')).not.toHaveClass(
    /\bpage-navigation-wrap\b/u,
  );
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).not.toHaveAttribute("pjax-page", "");
  const nextHref = await nextPageLink.getAttribute("href");
  expect(new URL(nextHref ?? "", "http://yona.test").pathname).toBe(`${basePath}/sites/issueList`);
  expect(new URL(nextHref ?? "", "http://yona.test").searchParams.get("pageNum")).toBe("2");
  expect(new URL(nextHref ?? "", "http://yona.test").searchParams.get("state")).toBe("closed");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-issues-closed-pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("closed");
  await expect(
    page.locator(
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-item"][data-selected="true"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toHaveText("Closed");
  const previousPageLink = page.locator("#pagination a", { hasText: "Previous page" });
  const previousHref = await previousPageLink.getAttribute("href");
  expect(new URL(previousHref ?? "", "http://yona.test").searchParams.get("pageNum")).toBe("1");
  expect(new URL(previousHref ?? "", "http://yona.test").searchParams.get("state")).toBe("closed");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-issues-closed-pagination");

  expect(await closedIssueListLayoutMetrics(page)).toEqual({
    contentContainsPagination: true,
    contentContainsRow: true,
    metaStaysInsideRow: true,
    paginationBelowRow: true,
    rowInsideContent: true,
    rowLinkOrder: [
      "owner:site-issue-list-project-avatar",
      "owner:site-issue-list-project-link",
      "owner:site-issue-list-title-link",
      "owner:site-issue-list-author-avatar",
      "owner:site-issue-list-metadata-item",
      "",
    ],
    tabsBelowTitle: true,
    titleTabsNoOverlap: true,
  });
});

test("site admin issue list preserves invalid nonblank state for backend rejection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const issueRequests = await mockInvalidIssueState(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/issueList?state=waiting`);

  await expect.poll(() => issueRequests.some((request) => request.state === "waiting")).toBe(true);
  expect(issueRequests.filter((request) => request.state === "open")).toEqual([]);
  expect(issueRequests[0]).toEqual({ page: "1", state: "waiting" });
  const invalidStateTabs = page.locator('[data-owner="site-issue-list-state-tabs"]');
  const invalidStateItems = invalidStateTabs.locator(
    '[data-owner="site-issue-list-state-tab-item"]',
  );
  await expect(invalidStateItems.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(invalidStateItems.first()).toHaveAttribute("data-selected", "false");
  await expect(invalidStateItems.nth(1)).toHaveAttribute("data-selected", "false");
  expect(
    await legacyLinkSnapshot(
      page,
      '[data-owner="site-issue-list-state-tabs"] [data-owner="site-issue-list-state-tab-link"]',
    ),
  ).toEqual([
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

  const routeSource = readFileSync("src/routes/sites/issueList.tsx", "utf8");
  expect(routeSource).toContain("function normalizeLegacyIssueStateSearch(state: unknown)");
  expect(routeSource).toContain("return state;");
  expect(routeSource).toContain("state: state as SiteIssueState");
  expect(routeSource).not.toContain(
    'state: search.state === "open" || search.state === "closed" ? search.state : undefined',
  );
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

  const updateLink = page.locator('[data-owner="site-issue-list-sidebar-link"]', {
    hasText: "Software Update",
  });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator('[data-owner="site-issue-list-sidebar-badge"]')).toHaveText("1");
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

  await expect(page.locator('[data-owner="site-issue-list-project-avatar-image"]')).toHaveAttribute(
    "src",
    "/assets/images/project_default_logo.png",
  );
  await expect(
    page.locator('[data-owner="site-issue-list-project-avatar-image"][src=""]'),
  ).toHaveCount(0);
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

  const authorAvatar = page.locator('[data-owner="site-issue-list-author-avatar-image"]');
  await expect(authorAvatar).toHaveAttribute("src", "/avatars/alice-custom.png");
  await expect(authorAvatar).toHaveAttribute("alt", "Alice Legal Name");
  await expect(authorAvatar).toHaveAttribute("width", "16");
  await expect(authorAvatar).toHaveAttribute("height", "16");
  await expect(page.locator('[data-owner="site-issue-list-metadata-item"]').first()).toHaveText(
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
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Boss",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "siteboss",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
}

type MockIssueOverrides = {
  authorAvatarUrl?: string;
  authorLabel?: string;
  authorLoginId?: string;
  authorName?: string;
  commentCount?: number;
  createdLabel?: string;
  createdTitle?: string;
  issueNumber?: string;
  ownerName?: string;
  projectLogoUrl?: string;
  projectName?: string;
  state?: "open" | "closed";
  title?: string;
  totalPages?: number;
};

async function mockIssues(page: Page, overrides: MockIssueOverrides = {}) {
  const requests: Array<{ page: string; state: string | null }> = [];

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
    const state =
      overrides.state ?? (url.searchParams.get("state") === "closed" ? "closed" : "open");
    requests.push({
      page: String(pageNum),
      state: url.searchParams.get("state"),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issues: [
          {
            assigneeLabel: "",
            authorAvatarUrl:
              overrides.authorAvatarUrl ?? "https://www.gravatar.com/avatar/alice-default?s=16",
            authorLabel: overrides.authorLabel ?? "Alice",
            authorLoginId: overrides.authorLoginId ?? "alice",
            authorName: overrides.authorName,
            commentCount: overrides.commentCount ?? 5,
            createdLabel: overrides.createdLabel ?? "1 day ago",
            createdTitle: overrides.createdTitle ?? "2026-06-29 13:00",
            issueNumber: overrides.issueNumber ?? "42",
            labels: [],
            milestoneTitle: "",
            ownerName: overrides.ownerName ?? "acme",
            projectLogoUrl: overrides.projectLogoUrl ?? "/assets/images/default-project-logo.png",
            projectName: overrides.projectName ?? "roadmap",
            state,
            title: overrides.title ?? "Fix release blocker",
            updatedLabel: "1 day ago",
            voterCount: 0,
            watcherCount: 0,
          },
        ],
        page: pageNum,
        pageSize: 20,
        state,
        total: overrides.totalPages ?? 2,
        totalPages: overrides.totalPages ?? 2,
      }),
    });
  });

  return requests;
}

async function mockInvalidIssueState(page: Page) {
  const requests: Array<{ page: string; state: string | null }> = [];

  await page.route("**/api/v1/site/issues?*", async (route) => {
    const url = new URL(route.request().url());
    requests.push({
      page: url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1",
      state: url.searchParams.get("state"),
    });
    await route.fulfill({
      body: JSON.stringify({ error: "invalid issue state" }),
      contentType: "application/json",
      status: url.searchParams.get("state") === "waiting" ? 400 : 200,
    });
  });

  return requests;
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
  return page.locator('[data-owner="site-issue-list-sidebar-link"]').evaluateAll((links) =>
    links.flatMap((link) => {
      const leaked = ["aria-current", "data-status"].filter((name) => link.hasAttribute(name));
      return leaked.map((name) => `${link.textContent?.trim() ?? ""}:${name}`);
    }),
  );
}

async function legacyLinkSnapshot(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: new Set(["site-issue-list-state-tab-link", "site-issue-list-sidebar-link"]).has(
        link.getAttribute("data-owner") ?? "",
      )
        ? null
        : link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      href: link.getAttribute("href"),
      pjaxPage: link.getAttribute("pjax-page"),
      text: link.textContent?.trim() ?? "",
      title: link.getAttribute("title"),
    })),
  );
}

async function closedIssueListLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const content = requireElement('[data-owner="site-issue-list-setting-content-column"]');
    const titleArea = requireElement('[data-owner="site-issue-list-title-strip"]');
    const tabs = requireElement('[data-owner="site-issue-list-state-tabs"]');
    const row = requireElement('[data-owner="site-issue-list-row"]');
    const meta = requireElement('[data-owner="site-issue-list-metadata"]');
    const pagination = requireElement("#pagination");
    const contentRect = content.getBoundingClientRect();
    const titleAreaRect = titleArea.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const metaRect = meta.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();

    return {
      contentContainsPagination:
        paginationRect.left >= contentRect.left &&
        paginationRect.right <= contentRect.right &&
        paginationRect.bottom <= contentRect.bottom,
      contentContainsRow: rowRect.left >= contentRect.left && rowRect.right <= contentRect.right,
      metaStaysInsideRow: metaRect.left >= rowRect.left && metaRect.right <= rowRect.right,
      paginationBelowRow: paginationRect.top >= rowRect.bottom,
      rowInsideContent: rowRect.top >= contentRect.top && rowRect.bottom <= contentRect.bottom,
      rowLinkOrder: Array.from(row.querySelectorAll("a")).map((link) => {
        const styleOwner = link.getAttribute("data-owner");
        if (styleOwner) {
          return `owner:${styleOwner}`;
        }
        return link.getAttribute("class") ?? "";
      }),
      tabsBelowTitle: tabsRect.top >= titleAreaRect.bottom,
      titleTabsNoOverlap: titleAreaRect.bottom <= tabsRect.top,
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

async function issueListMetrics(page: Page) {
  return page.evaluate(() => {
    const row = requireElement('[data-owner="site-issue-list-setting-grid"]');
    const sidebar = requireElement('[data-owner="site-issue-list-setting-sidebar-column"]');
    const content = requireElement('[data-owner="site-issue-list-setting-content-column"]');
    const titleArea = requireElement('[data-owner="site-issue-list-title-strip"]');
    const tabs = requireElement('[data-owner="site-issue-list-state-tabs"]');
    const firstRow = requireElement('[data-owner="site-issue-list-row"]');
    const avatarWrap = requireElement('[data-owner="site-issue-list-project-avatar"]');
    const avatarImage = requireElement('[data-owner="site-issue-list-project-avatar-image"]');
    const postInfo = requireElement('[data-owner="site-issue-list-info"]');
    const postProject = requireElement('[data-owner="site-issue-list-project-link"]');
    const separator = requireElement('[data-owner="site-issue-list-separator"]');
    const postTitle = requireElement('[data-owner="site-issue-list-title-link"]');
    const meta = requireElement('[data-owner="site-issue-list-metadata"]');
    const metaAvatar = requireElement('[data-owner="site-issue-list-author-avatar"]');
    const metaItem = requireElement('[data-owner="site-issue-list-metadata-item"]');
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
    const navbar = requireElement("[data-owner=global-gnb-outer]");
    const gnbInner = requireElement('[data-owner="global-gnb-inner"]');
    const search = requireElement('form[name="gnb-search-form"]');
    const feedbackLink = requireElement(
      '[data-owner="global-gnb-nav"] > li > a[href="https://github.com/yona-projects/yona/issues"]',
    );
    const listAllLink = requireElement('[data-owner="global-gnb-nav"] > li > a[href$="/projects"]');
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
        ".unsupported, [data-owner=global-gnb-outer], [data-owner=site-issue-list-breadcrumb-outer], [data-owner=site-issue-list-page-wrap-outer], [data-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (name === "class" && current.matches('[data-owner="site-issue-list-pagination-icon"]')) {
        const isPrevious = current.closest("li")?.matches(":first-child") ?? false;
        const isOff = current.getAttribute("data-pagination-state") === "off";
        return `ico ${isPrevious ? "btn-pg-prev" : "btn-pg-next"}${isOff ? " off" : ""}`;
      }
      if (name === "class" && current.matches('[data-owner="site-issue-list-comments-icon"]')) {
        return "yobicon-comments";
      }
      if (
        name === "class" &&
        (current.matches('[data-owner="global-gnb-inner"]') ||
          current.matches('[data-owner="global-gnb-outer"]') ||
          current.matches('[data-owner="site-footer"]') ||
          current.matches('[data-owner="site-footer-inner"]') ||
          current.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        new Set([
          "site-issue-list-sidebar",
          "site-issue-list-breadcrumb-outer",
          "site-issue-list-breadcrumb-inner",
          "site-issue-list-breadcrumb-heading",
          "site-issue-list-page-wrap-outer",
          "site-issue-list-setting-wrap",
          "site-issue-list-setting-grid",
          "site-issue-list-setting-sidebar-column",
          "site-issue-list-setting-content-column",
          "site-issue-list-sidebar-item",
          "site-issue-list-sidebar-link",
          "site-issue-list-sidebar-badge",
          "site-issue-list-title-strip",
          "site-issue-list-title-heading",
          "site-issue-list-container",
          "site-issue-list-row",
          "site-issue-list-project-avatar",
          "site-issue-list-project-avatar-image",
          "site-issue-list-info",
          "site-issue-list-project-link",
          "site-issue-list-separator",
          "site-issue-list-title-link",
          "site-issue-list-metadata",
          "site-issue-list-author-avatar",
          "site-issue-list-author-avatar-image",
          "site-issue-list-metadata-item",
          "site-issue-list-comments-icon",
          "site-issue-list-pagination",
          "site-issue-list-pagination-list",
          "site-issue-list-pagination-item",
          "site-issue-list-pagination-input",
          "site-issue-list-pagination-label",
          "site-issue-list-pagination-icon",
        ]).has(current.getAttribute("data-owner") ?? "")
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => !token.startsWith("x"))
          .join(" ");
      }
      if (name === "class" && current.matches('[data-owner="site-issue-list-container"] > li')) {
        return value
          .split(/\s+/u)
          .filter(
            (token) => token !== "row-fluid" && token !== "listitem" && !token.startsWith("x"),
          )
          .join(" ");
      }
      if (
        name === "class" &&
        current.matches('[data-owner="site-issue-list-container"] > li > a:first-child')
      ) {
        return value
          .split(/\s+/u)
          .filter(
            (token) => token !== "avatar-wrap" && token !== "list-avatar" && !token.startsWith("x"),
          )
          .join(" ");
      }
      if (
        name === "class" &&
        current.matches('[data-owner="site-issue-list-container"] > li > div:last-child')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "post-meta-wrap" && !token.startsWith("x"))
          .join(" ");
      }
      if (
        name === "class" &&
        current.matches(
          '[data-owner="site-issue-list-container"] > li > div:last-child > a:first-child',
        )
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "avatar-wrap" && !token.startsWith("x"))
          .join(" ");
      }
      if (
        name === "class" &&
        current.matches(
          '[data-owner="site-issue-list-container"] > li > div:last-child > :not(:first-child)',
        )
      ) {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token !== "post-meta-item" && token !== "post-comments" && !token.startsWith("x"),
          )
          .join(" ");
      }
      if (name === "class" && current.matches("#pagination")) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "page-navigation-wrap" && !token.startsWith("x"))
          .join(" ");
      }
      if (name === "class" && current.matches("#pagination > ul")) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "page-nums" && !token.startsWith("x"))
          .join(" ");
      }
      if (name === "class" && current.matches("#pagination > ul > li")) {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token !== "page-num" &&
              token !== "ikon" &&
              token !== "delimiter" &&
              !token.startsWith("x"),
          )
          .join(" ");
      }
      if (name === "class" && current.matches('#pagination input[name="pageNum"]')) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "input-mini" && !token.startsWith("x"))
          .join(" ");
      }
      if (name === "class" && current.matches("#pagination span")) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "off" && !token.startsWith("x"))
          .join(" ");
      }
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      if (name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
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
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === ""),
        )
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
      let value = current.getAttribute(name) ?? "";
      if (name === "class") {
        const retiredIssueListTokens = new Set([
          "title_area",
          "pull-left",
          "post-list-wrap",
          "post-info-wrap",
          "post-project",
          "post-info-separator",
          "post-title",
        ]);
        if (current.matches(".site-breadcrumb-outer")) {
          retiredIssueListTokens.add("site-breadcrumb-outer");
        }
        if (current.matches(".site-breadcrumb-inner")) {
          retiredIssueListTokens.add("site-breadcrumb-inner");
        }
        if (current.matches(".site-setting-wrap")) {
          retiredIssueListTokens.add("site-setting-wrap");
        }
        if (current.matches(".page-wrap-outer")) {
          retiredIssueListTokens.add("page-wrap-outer");
        }
        if (current.matches(".site-setting-wrap > .row-fluid")) {
          retiredIssueListTokens.add("row-fluid");
        }
        if (current.matches(".site-setting-wrap > .row-fluid > .span2")) {
          retiredIssueListTokens.add("span2");
        }
        if (current.matches(".site-setting-wrap > .row-fluid > .span10")) {
          retiredIssueListTokens.add("span10");
        }
        if (current.matches(".post-list-wrap > li")) {
          retiredIssueListTokens.add("row-fluid");
          retiredIssueListTokens.add("listitem");
        }
        value = value
          .split(/\s+/u)
          .filter((token) => !retiredIssueListTokens.has(token))
          .join(" ");
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
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === ""),
        )
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
