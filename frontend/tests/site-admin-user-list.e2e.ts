import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_USER_LIST_SCREEN = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar active"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
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
          <li class="active"><a href="__BASE_PATH__/sites/userList">Users</a></li>
          <li class=""><a href="__BASE_PATH__/sites/postList">Posts</a></li>
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
          <h2 class="pull-left">Users</h2>
          <form class="form-search pull-right" action="__BASE_PATH__/sites/userList">
            <input type="hidden" name="state" value="ACTIVE">
            <div class="search-bar">
              <input class="textbox" name="query" type="text" placeholder="Find user by login ID, user name or email" value="">
              <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
            </div>
          </form>
        </div>
        <ul class="nav nav-tabs">
          <li class="active"><a href="__BASE_PATH__/sites/userList?state=ACTIVE">Unlocked user</a></li>
          <li class=""><a href="__BASE_PATH__/sites/userList?state=LOCKED">Locked user</a></li>
          <li class=""><a href="__BASE_PATH__/sites/userList?state=DELETED">Deleted user</a></li>
          <li class=""><a href="__BASE_PATH__/sites/userList?state=GUEST">Guest User</a></li>
          <li class=""><a href="__BASE_PATH__/sites/userList?state=SITE_ADMIN">Site admin<span class="num-badge">2</span></a></li>
        </ul>
        <div class="row-fluid listhead">
          <div class="span3 listhead-title"><strong>Name</strong></div>
          <div class="span3 listhead-title"><strong>Email address</strong></div>
          <div class="span2 listhead-title"><strong>Member since</strong></div>
          <div class="span4 listhead-title"><strong>&nbsp;</strong></div>
        </div>
        <ul class="user-list-wrap">
          <li class="row-fluid listitem">
            <div class="span3 listitem-col">
              <a href="__BASE_PATH__/doortts" class="avatar-wrap list-avatar"><img src="/avatars/doortts.png" alt="Door TTS" width="32" height="32"></a>
              <a href="__BASE_PATH__/doortts" class="user-name">Door TTS</a>
              <a href="__BASE_PATH__/doortts" class="user-id">@doortts</a>
            </div>
            <div class="span3 listitem-col">
              <span class="email">doortts@example.com</span>
            </div>
            <div class="span2 listitem-col created-date">
              <span>2026-06-28 12:00:00</span>
            </div>
            <div class="span5 listitem-col action-buttons">
              <button type="button" class="ybtn ybtn-small" data-request-method="post" data-request-uri="__BASE_PATH__/sites/user/doortts/guest/toggle?state=ACTIVE">Make Guest</button>
              <button type="button" class="ybtn ybtn-small" data-request-method="post" data-request-uri="__BASE_PATH__/sites/user/doortts/account-lock/toggle?state=ACTIVE">Lock account</button>
              <button id="doortts" class="ybtn ybtn-small" data-toggle="reset-password" data-href="__BASE_PATH__/doortts?action=resetPassword">Reset password</button>
              <button type="button" class="ybtn ybtn-small label-info" data-request-method="post" data-request-uri="__BASE_PATH__/sites/user/doortts/site-admin/toggle">Upgrade to Site admin</button>
              <button class="ybtn ybtn-small ybtn-danger" data-toggle="account-delete" data-href="__BASE_PATH__/sites/user/42" data-user-id="doortts" data-user-name="Door TTS">Delete</button>
            </div>
          </li>
        </ul>
        <div id="pagination" class="page-navigation-wrap">
          <ul class="page-nums">
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">PREV</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/userList?pageNum=2&amp;state=ACTIVE"><span>NEXT</span><i class="ico btn-pg-next"></i></a></li>
          </ul>
        </div>
        <div id="alertDeletionWrap" class="modal fade">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">×</button>
            <span id="userInfo"></span>
            <span>Delete user</span>
          </div>
          <div class="modal-body">
            <p>Are you sure you want this user to leave?</p>
          </div>
          <div class="modal-footer">
            <button type="button" id="accountToggleBtn" class="ybtn ybtn-danger">Yes</button>
            <button type="button" class="ybtn" data-dismiss="modal">No</button>
          </div>
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

test("site admin user list matches legacy site/userList.scala.html populated DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
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
  await expect(page.locator(".site-setting-nav li").nth(0)).toHaveClass("active");
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(1);
  await expect(page.locator('.site-setting-nav a[href$="/sites/setting"]')).toHaveCount(0);
  await expect(page.locator(".site-setting-wrap")).not.toContainText("TODO");
  await expect(page.locator(".action-buttons a[data-request-method]")).toHaveCount(0);
  await expect(page.locator(".action-buttons button")).toHaveCount(5);
  const guestToggleButton = page.locator(
    '.action-buttons button[data-request-uri$="/guest/toggle?state=ACTIVE"]',
  );
  await expect(guestToggleButton).toHaveAttribute("type", "button");
  await expect(guestToggleButton).toHaveClass("ybtn ybtn-small");
  await expect(guestToggleButton).toHaveAttribute("data-request-method", "post");
  await expect(
    page.locator('.action-buttons button[data-request-uri$="/account-lock/toggle?state=ACTIVE"]'),
  ).toHaveAttribute("type", "button");
  await expect(
    page.locator('.action-buttons button[data-request-uri$="/site-admin/toggle"]'),
  ).toHaveClass("ybtn ybtn-small label-info");
  await expect(page.locator('#alertDeletionWrap a[id="accountToggleBtn"]')).toHaveCount(0);
  await expect(page.locator("#accountToggleBtn")).toHaveAttribute("type", "button");
  await expect(page.locator("#accountToggleBtn")).toHaveClass("ybtn ybtn-danger");
  await expect(page.locator(".user-list-wrap .list-avatar img")).toHaveAttribute("alt", "Door TTS");
  await expect(page.locator(".user-list-wrap .list-avatar img")).toHaveAttribute("width", "32");
  await expect(page.locator(".user-list-wrap .list-avatar img")).toHaveAttribute("height", "32");
  await expect(page.locator(".user-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator("#pagination")).toHaveClass("page-navigation-wrap");
  await expect(page.locator("#pagination .page-nums .page-num")).toHaveCount(5);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "NEXT" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?pageNum=2&state=ACTIVE`,
  );
  await expect(nextPageLink).not.toHaveAttribute("pjax-page", "");
  const lockedTab = page.getByRole("link", { exact: true, name: "Locked user" });
  await expect(lockedTab).toHaveAttribute("href", `${basePath}/sites/userList?state=LOCKED`);
  await expect(page.locator(".nav-tabs .num-badge")).toHaveText("2");
  const routeSource = readFileSync("src/routes/sites/userList.tsx", "utf8");
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("to={item.href}");
  expect(routeSource).not.toContain('"pjax-page": ""');
  expect(routeSource).not.toContain("<a href={userPath}");
  expect(routeSource).not.toMatch(
    /<a[\s\S]*?(?:accountToggleBtn|data-request-method|data-request-uri)/u,
  );
  expect(routeSource).toMatch(/<button\s+type="button"\s+id="accountToggleBtn"/u);
  expect(routeSource).toMatch(/<button\s+type="button"[\s\S]*?data-request-method="post"/u);
  expect(routeSource).toMatch(
    /<Link\s+activeProps=\{\{ className: undefined \}\}\s+className="avatar-wrap list-avatar"\s+params=\{\{ user: user\.loginId \}\}\s+to="\/\$user"/u,
  );
  expect(routeSource).toMatch(
    /<Link\s+activeProps=\{\{ className: undefined \}\}\s+className="user-name"\s+params=\{\{ user: user\.loginId \}\}\s+to="\/\$user"/u,
  );
  expect(routeSource).toMatch(
    /<Link\s+activeProps=\{\{ className: undefined \}\}\s+className="user-id"\s+params=\{\{ user: user\.loginId \}\}\s+to="\/\$user"/u,
  );
  expect(await siteLayoutRootOrder(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_LIST_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await userListMetrics(page)).toEqual({
    actionColumnRatio: 0.4,
    actionRowButtonCount: 5,
    avatarHeight: 32,
    avatarWrapHeight: 45,
    avatarWrapMarginRight: 10,
    avatarWrapMarginTop: 3,
    avatarWrapWidth: 45,
    avatarWidth: 32,
    contentWidthRatio: 0.83,
    emailFontSize: 13,
    emailLineHeight: 43,
    firstHeaderColumnRatio: 0.23,
    firstRowColumnRatio: 0.23,
    firstRowLineHeight: 70,
    listHeadHeight: 41,
    listItemColumnFontSize: 12,
    listItemColumnLineHeight: 20,
    listItemColumnPaddingBlock: 20,
    modalWidth: 562,
    nameIdGap: 0,
    paginationOffsetTop: 16,
    searchFormOffsetTop: 0,
    sidebarWidthRatio: 0.15,
    tabHeight: 38,
    titleAreaHeight: 39,
    userIdColor: "rgb(153, 153, 153)",
    userIdFontSize: 13,
    userIdFontStyle: "italic",
    userNameColor: "rgb(0, 136, 204)",
    userNameFontSize: 14,
    userNameFontWeight: "700",
    userNameMarginTop: 8,
    userSearchInputWidth: 350,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-pagination";
  });
  await nextPageLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("ACTIVE");
  await expect(page.locator(".site-setting-wrap .nav-tabs li.active a")).toHaveText(
    "Unlocked user",
  );
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-pagination");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-tabs";
  });
  await lockedTab.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("LOCKED");
  await expect(page.locator(".site-setting-wrap .nav-tabs li.active a")).toHaveText("Locked user");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-tabs");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-search";
  });
  await page.locator('.form-search input[name="query"]').fill("door");
  await page.locator(".form-search").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Expected user search form");
    }
    form.requestSubmit();
  });
  await expect.poll(() => new URL(page.url()).searchParams.get("query")).toBe("door");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("LOCKED");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-search");
  await expect(page.getByRole("link", { exact: true, name: "Unlocked user" })).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?query=door&state=ACTIVE`,
  );
  const nextPageWithQueryLink = page.locator("#pagination a", { hasText: "NEXT" });
  await expect(nextPageWithQueryLink).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?pageNum=2&query=door&state=LOCKED`,
  );
  await expect(nextPageWithQueryLink).not.toHaveAttribute("pjax-page", "");
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-users-pagination-query";
  });
  await nextPageWithQueryLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("query")).toBe("door");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("LOCKED");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-pagination-query");

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
});

test("site admin user profile links preserve legacy hrefs and use SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);
  await expect(page.locator(".user-list-wrap .listitem")).toHaveCount(1);

  const avatarLink = page.locator(".user-list-wrap .list-avatar");
  const userNameLink = page.locator(".user-list-wrap .user-name");
  const userIdLink = page.locator(".user-list-wrap .user-id");
  await expect(avatarLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(avatarLink).toHaveClass("avatar-wrap list-avatar");
  await expect(userNameLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(userNameLink).toHaveClass("user-name");
  await expect(userNameLink).toHaveText("Door TTS");
  await expect(userIdLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(userIdLink).toHaveClass("user-id");
  await expect(userIdLink).toHaveText("@doortts");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-profile";
  });
  await userNameLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/doortts`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-profile");
});

test("site admin user actions follow legacy confirmation and alert flow", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockSiteUsers(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);

  await page.locator('[data-toggle="account-delete"]').click();
  await expect(page.locator("#userInfo")).toHaveText("Door TTS(doortts)");
  await expect(page.locator("#alertDeletionWrap")).not.toHaveClass(/hide/);
  expect(requests.deletedLoginIds).toEqual([]);

  await page.locator('#alertDeletionWrap [data-dismiss="modal"]').last().click();
  await expect(page.locator("#alertDeletionWrap")).toHaveClass(/hide/);
  expect(requests.deletedLoginIds).toEqual([]);

  await page.locator('[data-toggle="account-delete"]').click();
  const deleteReloadPromise = page.waitForEvent("framenavigated");
  await page.locator("#accountToggleBtn").click();
  await deleteReloadPromise;
  await expect.poll(() => requests.deletedLoginIds).toEqual(["doortts"]);

  await page.locator('[data-toggle="reset-password"]').click();
  await expect(page.locator(".action-buttons .alert-success h4")).toHaveText(
    "New password: reset-1234",
  );
  expect(requests.resetLoginIds).toEqual(["doortts"]);
});

test("site admin user delete forbidden reloads legacy page", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page, { deleteForbidden: true });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "delete-forbidden";
  });

  await page.locator('[data-toggle="account-delete"]').click();
  await expect(page.locator("#userInfo")).toHaveText("Door TTS(doortts)");

  const reloadPromise = page.waitForEvent("framenavigated");
  await page.locator("#accountToggleBtn").click();
  await reloadPromise;

  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBeUndefined();
});

test("site admin user reset password failure uses legacy alert text", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page, { resetFails: true });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);

  const alertPromise = page.waitForEvent("dialog");
  await page.locator('[data-toggle="reset-password"]').click();
  const alert = await alertPromise;
  expect(alert.message()).toBe("password change failed: reset service unavailable");
  await alert.accept();
  await expect(page.locator(".action-buttons .alert-fail")).toHaveCount(0);
  await expect(page.locator(".action-buttons .alert-success")).toHaveCount(0);
});

test("site admin user reset password logical failure uses legacy alert text", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page, { resetLogicalFailure: true });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);

  const alertPromise = page.waitForEvent("dialog");
  await page.locator('[data-toggle="reset-password"]').click();
  const alert = await alertPromise;
  expect(alert.message()).toBe("password change failed: password policy rejected");
  await alert.accept();
  await expect(page.locator(".action-buttons .alert-fail")).toHaveCount(0);
  await expect(page.locator(".action-buttons .alert-success")).toHaveCount(0);
});

test("site admin user role toggle success reloads like legacy requestAs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockSiteUsers(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "toggle-success";
  });

  const reloadPromise = page.waitForEvent("framenavigated");
  await page.locator('[data-request-uri$="/guest/toggle?state=ACTIVE"]').click();
  await reloadPromise;

  await expect.poll(() => requests.toggledActions).toEqual(["doortts:guest"]);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBeUndefined();
});

test("site admin user list renders legacy update notification badge", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page);
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isAvailable",
    releaseUrl: "https://example.test/yona-1.1.0",
    versionToUpdate: "1.1.0",
  });

  await page.goto(`${basePath}/sites/userList`);

  const updateLink = page.locator(".site-setting-nav a", { hasText: "Software Update" });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(updateLink.locator(".notification-badge")).toHaveText("1");
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

  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({ user: { loginId: "siteboss" } }),
    });
  });
}

async function mockSiteUsers(
  page: Page,
  options: { deleteForbidden?: boolean; resetFails?: boolean; resetLogicalFailure?: boolean } = {},
) {
  const requests = {
    deletedLoginIds: [] as string[],
    resetLoginIds: [] as string[],
    toggledActions: [] as string[],
  };

  await page.route("**/avatars/doortts.png", async (route) => {
    await route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgwGdrZtEwwAAAABJRU5ErkJggg==",
        "base64",
      ),
      contentType: "image/png",
    });
  });

  await page.route("**/api/v1/site/users?*", async (route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1") || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNum,
        pageSize: 20,
        query: "",
        siteAdminCount: 3,
        state: "ACTIVE",
        total: 2,
        totalPages: 2,
        users: [
          {
            avatarUrl: "/avatars/doortts.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Door TTS",
            emailAddress: "doortts@example.com",
            id: 42,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "doortts",
            state: "ACTIVE",
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/site/users/*/password/reset", async (route) => {
    const loginId = new URL(route.request().url()).pathname.split("/").at(-3) ?? "";
    requests.resetLoginIds.push(loginId);
    if (options.resetFails) {
      await route.fulfill({
        contentType: "application/json",
        status: 500,
        body: JSON.stringify({
          error: {
            code: "password_reset_failed",
            message: "reset service unavailable",
            status: 500,
          },
        }),
      });
      return;
    }
    if (options.resetLogicalFailure) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          isSuccess: false,
          loginId,
          name: "Door TTS",
          reason: "password policy rejected",
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isSuccess: true,
        loginId,
        name: "Door TTS",
        newPassword: "reset-1234",
      }),
    });
  });

  await page.route("**/api/v1/site/users/**", async (route) => {
    const pathParts = new URL(route.request().url()).pathname.split("/");
    const loginId = pathParts.at(-1) ?? "";
    const action = pathParts.at(-2) ?? "";
    if (
      route.request().method() === "POST" &&
      (action === "guest" || action === "account-lock" || action === "site-admin")
    ) {
      const targetLoginId = pathParts.at(-3) ?? "";
      requests.toggledActions.push(`${targetLoginId}:${action}`);
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            avatarUrl: "/avatars/doortts.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Door TTS",
            emailAddress: "doortts@example.com",
            id: 42,
            isGuest: action === "guest",
            isSiteAdmin: action === "site-admin",
            lastStateModifiedAt: "",
            loginId: targetLoginId,
            state: action === "account-lock" ? "LOCKED" : "ACTIVE",
          },
        }),
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      requests.deletedLoginIds.push(loginId);
      if (options.deleteForbidden) {
        await route.fulfill({
          contentType: "application/json",
          status: 403,
          body: JSON.stringify({
            error: {
              code: "forbidden",
              message: "delete forbidden",
              status: 403,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            avatarUrl: "/avatars/doortts.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Door TTS",
            emailAddress: "doortts@example.com",
            id: 42,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "2026-06-30 09:00:00",
            loginId,
            state: "DELETED",
          },
        }),
      });
      return;
    }
    await route.fallback();
  });

  return requests;
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
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "src",
        "width",
        "height",
        "target",
        "title",
        "max",
        "min",
        "pattern",
        "data-toggle",
        "data-placement",
        "data-dismiss",
        "data-href",
        "data-request-method",
        "data-request-uri",
        "data-user-id",
        "data-user-name",
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

async function siteLayoutRootOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
      (element) => element.getAttribute("class"),
    ),
  );
}

async function userListMetrics(page: Page) {
  return page.evaluate(() => {
    const titleArea = requireElement(".title_area");
    const title = requireElement(".title_area h2");
    const searchForm = requireElement(".title_area .form-search");
    const searchInput = requireElement('.title_area input[name="query"]');
    const row = requireElement(".site-setting-wrap > .row-fluid");
    const sidebar = requireElement(".site-setting-wrap > .row-fluid > .span2");
    const content = requireElement(".site-setting-wrap > .row-fluid > .span10");
    const tabs = requireElement(".span10 > .nav.nav-tabs");
    const listHead = requireElement(".listhead");
    const firstHeaderColumn = requireElement(".listhead .span3");
    const firstRow = requireElement(".user-list-wrap .listitem");
    const firstRowColumn = requireElement(".user-list-wrap .listitem .span3");
    const actionColumn = requireElement(".user-list-wrap .action-buttons");
    const avatarWrap = requireElement(".user-list-wrap .list-avatar");
    const avatar = requireElement(".user-list-wrap .list-avatar img");
    const userName = requireElement(".user-list-wrap .user-name");
    const userId = requireElement(".user-list-wrap .user-id");
    const email = requireElement(".user-list-wrap .email");
    const pagination = requireElement("#pagination");
    const modal = requireElement("#alertDeletionWrap");
    const titleAreaRect = titleArea.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const searchInputRect = searchInput.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const listHeadRect = listHead.getBoundingClientRect();
    const firstHeaderColumnRect = firstHeaderColumn.getBoundingClientRect();
    const firstRowRect = firstRow.getBoundingClientRect();
    const firstRowColumnRect = firstRowColumn.getBoundingClientRect();
    const actionColumnRect = actionColumn.getBoundingClientRect();
    const avatarWrapStyle = getComputedStyle(avatarWrap);
    const avatarWrapRect = avatarWrap.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const firstRowStyle = getComputedStyle(firstRow);
    const firstRowColumnStyle = getComputedStyle(firstRowColumn);
    const userNameStyle = getComputedStyle(userName);
    const userIdStyle = getComputedStyle(userId);
    const emailStyle = getComputedStyle(email);
    const userNameRect = userName.getBoundingClientRect();
    const userIdRect = userId.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();

    return {
      actionColumnRatio: Number((actionColumnRect.width / firstRowRect.width).toFixed(2)),
      actionRowButtonCount: actionColumn.querySelectorAll(".ybtn").length,
      avatarHeight: Math.round(avatarRect.height),
      avatarWrapHeight: Math.round(avatarWrapRect.height),
      avatarWrapMarginRight: Math.round(parseFloat(avatarWrapStyle.marginRight)),
      avatarWrapMarginTop: Math.round(parseFloat(avatarWrapStyle.marginTop)),
      avatarWrapWidth: Math.round(avatarWrapRect.width),
      avatarWidth: Math.round(avatarRect.width),
      contentWidthRatio: Number((contentRect.width / rowRect.width).toFixed(2)),
      emailFontSize: Math.round(parseFloat(emailStyle.fontSize)),
      emailLineHeight: Math.round(parseFloat(emailStyle.lineHeight)),
      firstHeaderColumnRatio: Number((firstHeaderColumnRect.width / listHeadRect.width).toFixed(2)),
      firstRowColumnRatio: Number((firstRowColumnRect.width / firstRowRect.width).toFixed(2)),
      firstRowLineHeight: Math.round(parseFloat(firstRowStyle.lineHeight)),
      listHeadHeight: Math.round(listHeadRect.height),
      listItemColumnFontSize: Math.round(parseFloat(firstRowColumnStyle.fontSize)),
      listItemColumnLineHeight: Math.round(parseFloat(firstRowColumnStyle.lineHeight)),
      listItemColumnPaddingBlock:
        Math.round(parseFloat(firstRowColumnStyle.paddingTop)) +
        Math.round(parseFloat(firstRowColumnStyle.paddingBottom)),
      modalWidth: Math.round(modalRect.width),
      nameIdGap: Math.round(userIdRect.top - userNameRect.bottom),
      paginationOffsetTop: Math.round(paginationRect.top - firstRowRect.bottom),
      searchFormOffsetTop: Math.round(searchFormRect.top - titleRect.top),
      sidebarWidthRatio: Number((sidebarRect.width / rowRect.width).toFixed(2)),
      tabHeight: Math.round(tabsRect.height),
      titleAreaHeight: Math.round(titleAreaRect.height),
      userIdColor: userIdStyle.color,
      userIdFontSize: Math.round(parseFloat(userIdStyle.fontSize)),
      userIdFontStyle: userIdStyle.fontStyle,
      userNameColor: userNameStyle.color,
      userNameFontSize: Math.round(parseFloat(userNameStyle.fontSize)),
      userNameFontWeight: userNameStyle.fontWeight,
      userNameMarginTop: Math.round(parseFloat(userNameStyle.marginTop)),
      userSearchInputWidth: Math.round(searchInputRect.width),
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
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "src",
        "width",
        "height",
        "target",
        "title",
        "max",
        "min",
        "pattern",
        "data-toggle",
        "data-placement",
        "data-dismiss",
        "data-href",
        "data-request-method",
        "data-request-uri",
        "data-user-id",
        "data-user-name",
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
