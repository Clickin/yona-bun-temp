import { readFileSync } from "../wtr-compat.ts";
// Batch 1121: verify admin user bulk delete UI and API
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const SITE_USER_LIST_ROUTE_SOURCE = new URL("../src/routes/sites/userList.tsx", import.meta.url);
type MockSiteUserState = "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN";

const EXPECTED_USER_LIST_SCREEN = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar active"><i class="yobicon-wrench"></i></a></li>
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
              <button type="button" class="ybtn ybtn-small">Make Guest</button>
              <button type="button" class="ybtn ybtn-small">Lock account</button>
              <button type="button" id="doortts" class="ybtn ybtn-small">Reset password</button>
              <button type="button" class="ybtn ybtn-small label-info">Upgrade to Site admin</button>
              <button type="button" class="ybtn ybtn-small ybtn-danger">Delete</button>
            </div>
          </li>
        </ul>
        <div id="pagination" class="page-navigation-wrap">
          <ul class="page-nums">
            <li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li>
            <li class="page-num"><input class="input-mini nospinner" name="pageNum" type="number" value="1" max="2" min="1" pattern="[0-9]*"></li>
            <li class="page-num delimiter">/</li>
            <li class="page-num">2</li>
            <li class="page-num ikon"><a href="__BASE_PATH__/sites/userList?pageNum=2&amp;state=ACTIVE"><span>Next page</span><i class="ico btn-pg-next"></i></a></li>
          </ul>
        </div>
        <div id="alertDeletionWrap" class="modal fade">
          <div class="modal-header">
            <button type="button" class="close">×</button>
            <span id="userInfo"></span>
            <span>Delete user</span>
          </div>
          <div class="modal-body">
            <p>Are you sure you want this user to leave?</p>
          </div>
          <div class="modal-footer">
            <button type="button" id="accountToggleBtn" class="ybtn ybtn-danger">Yes</button>
            <button type="button" class="ybtn">No</button>
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
  await expect(page).toHaveTitle("Site settings");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent))
    .toBe("Site settings");
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/userList`);
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
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  const sidebarRoot = page.locator('[data-owner="site-user-list-sidebar-nav"]');
  const sidebarLinks = sidebarRoot.locator('[data-owner="site-user-list-sidebar-link"]');
  const selectedSidebarItem = sidebarRoot.locator(
    ':scope > [data-owner="site-user-list-sidebar-item"][data-selected="true"]',
  );
  await expect(
    selectedSidebarItem.locator('[data-owner="site-user-list-sidebar-link"]'),
  ).toHaveText("Users");
  await expect(sidebarLinks).toHaveText([
    "Users",
    "Posts",
    "Issues",
    "Projects",
    "Send email",
    "Send mass emails",
    "Software Update",
    "Diagnostics",
  ]);
  const sidebarHrefsProbe = await page
    .locator('[data-owner="site-user-list-sidebar-link"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(sidebarHrefsProbe).toEqual([
    `${basePath}/sites/userList`,
    `${basePath}/sites/postList`,
    `${basePath}/sites/issueList`,
    `${basePath}/sites/projectList`,
    `${basePath}/sites/mail`,
    `${basePath}/sites/massmail`,
    `${basePath}/sites/update`,
    `${basePath}/sites/diagnostic`,
  ]);
  await expect(selectedSidebarItem).toHaveCount(1);
  await expect(
    selectedSidebarItem.locator('[data-owner="site-user-list-sidebar-link"]'),
  ).toHaveAttribute("href", `${basePath}/sites/userList`);
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  await expect(sidebarLinks.locator('[href$="/sites/setting"]')).toHaveCount(0);
  await expect(page.locator(".site-setting-wrap")).not.toContainText("TODO");
  const actionOwner = page.locator('[data-owner="site-user-list-row-action"]');
  await expect(actionOwner.locator("a[data-request-method]")).toHaveCount(0);
  await expect(actionOwner.locator("button")).toHaveCount(5);
  await expect(
    actionOwner.locator("[data-request-method], [data-request-uri], [data-toggle], [data-href]"),
  ).toHaveCount(0);
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
        left: feedbackRect.left,
        right: feedbackRect.right,
        top: feedbackRect.top,
      },
      listAll: {
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
        right: searchFormRect.right,
        top: searchFormRect.top,
      },
    };
  });
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.searchForm.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchForm.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchForm.right).toBeLessThanOrEqual(shellBoxes!.navbar.right);
  expect(shellBoxes!.listAll.left).toBeGreaterThan(shellBoxes!.navbar.left);
  expect(shellBoxes!.listAll.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.feedback.left).toBeGreaterThan(shellBoxes!.listAll.right);
  expect(shellBoxes!.feedback.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  const guestToggleButton = page.getByRole("button", { exact: true, name: "Make Guest" });
  await expect(guestToggleButton).toHaveAttribute("type", "button");
  await expect(guestToggleButton).toHaveAttribute("data-owner", "site-user-list-row-action-button");
  await expect(guestToggleButton).toHaveAttribute("data-action", "guest");
  await expect(guestToggleButton).not.toHaveClass(/(?:^|\s)(?:ybtn|ybtn-small)(?:\s|$)/u);
  await expect(guestToggleButton).not.toHaveAttribute("data-request-method", /./u);
  await expect(guestToggleButton).not.toHaveAttribute("data-request-uri", /./u);
  await expect(page.getByRole("button", { exact: true, name: "Lock account" })).toHaveAttribute(
    "type",
    "button",
  );
  const resetPasswordButton = page.getByRole("button", {
    exact: true,
    name: "Reset password",
  });
  await expect(resetPasswordButton).toHaveAttribute("type", "button");
  await expect(resetPasswordButton).toHaveAttribute("id", "doortts");
  await expect(resetPasswordButton).not.toHaveAttribute("data-toggle", "reset-password");
  await expect(resetPasswordButton).not.toHaveAttribute("data-href", /./u);
  const siteAdminButton = page.getByRole("button", {
    exact: true,
    name: "Upgrade to Site admin",
  });
  await expect(siteAdminButton).toHaveAttribute("data-owner", "site-user-list-row-action-button");
  await expect(siteAdminButton).toHaveAttribute("data-action", "site-admin");
  await expect(siteAdminButton).not.toHaveClass(/(?:^|\s)(?:ybtn|ybtn-small|label-info)(?:\s|$)/u);
  const accountDeleteButton = page.getByRole("button", { exact: true, name: "Delete" });
  await expect(accountDeleteButton).toHaveAttribute("type", "button");
  await expect(accountDeleteButton).not.toHaveAttribute("data-toggle", "account-delete");
  await expect(accountDeleteButton).not.toHaveAttribute("data-href", /./u);
  await expect(accountDeleteButton).not.toHaveAttribute("data-user-id", /./u);
  await expect(accountDeleteButton).not.toHaveAttribute("data-user-name", /./u);
  await expect(page.locator('#alertDeletionWrap a[id="accountToggleBtn"]')).toHaveCount(0);
  await expect(page.locator("#accountToggleBtn")).toHaveAttribute("type", "button");
  await expect(page.locator("#accountToggleBtn")).toHaveAttribute(
    "data-owner",
    "site-user-list-delete-modal-button",
  );
  await expect(page.locator("#accountToggleBtn")).not.toHaveClass(/\bybtn(?:-danger)?\b/u);
  await expect(page.locator('#alertDeletionWrap [data-dismiss="modal"]')).toHaveCount(0);
  const avatarImage = page.locator('[data-owner="site-user-list-row-avatar"] img');
  await expect(avatarImage).toHaveAttribute("alt", "Door TTS");
  await expect(avatarImage).toHaveAttribute("width", "32");
  await expect(avatarImage).toHaveAttribute("height", "32");
  await expect(
    page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-owner="site-user-list-pagination"]')).not.toHaveClass(
    /page-navigation-wrap/u,
  );
  await expect(
    page.locator(
      '[data-owner="site-user-list-pagination-list"] > [data-owner="site-user-list-pagination-item"]',
    ),
  ).toHaveCount(5);
  await expect(page.locator("#pagination .page-nums, #pagination .page-num")).toHaveCount(0);
  await expect(page.locator("#pagination.pagination")).toHaveCount(0);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  const nextPageLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?pageNum=2&state=ACTIVE`,
  );
  await expect(nextPageLink).toHaveText("Next page");
  await expect(nextPageLink).not.toHaveAttribute("class", "");
  await expect(nextPageLink).not.toHaveAttribute("title", "");
  expect(await linkActiveMarkerLeaks(nextPageLink)).toEqual([]);
  await expect(nextPageLink).not.toHaveAttribute("pjax-page", "");
  const lockedTab = page.getByRole("link", { exact: true, name: "Locked user" });
  await expect(lockedTab).toHaveAttribute("href", `${basePath}/sites/userList?state=LOCKED`);
  await expect(lockedTab).toHaveText("Locked user");
  await expect(lockedTab).not.toHaveAttribute("class", "");
  await expect(lockedTab).not.toHaveAttribute("title", "");
  expect(await linkActiveMarkerLeaks(lockedTab)).toEqual([]);
  await expect(page.locator('[data-owner="site-user-list-state-tabs"] .num-badge')).toHaveText("2");
  const userNameAnchor = page.locator('[data-owner="site-user-list-row-user-name"]');
  await expect(userNameAnchor).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(userNameAnchor).toHaveText("Door TTS");
  await expect(userNameAnchor).not.toHaveClass(/user-name/u);
  await expect(userNameAnchor).not.toHaveAttribute("title", "");
  expect(await linkActiveMarkerLeaks(userNameAnchor)).toEqual([]);
  const routeSource = readFileSync(SITE_USER_LIST_ROUTE_SOURCE, "utf8");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toMatch(/<a\b/u);
  expect(routeSource).toContain('<title>{t("title.siteSetting")}</title>');
  expect(routeSource).not.toContain("useLegacySiteUserListDocumentTitle");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toMatch(/useEffect\s*\(/u);
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).toContain("LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS");
  expect(routeSource).toContain("explicitUndefined: true");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("to={item.href}");
  expect(routeSource).not.toContain('"pjax-page": ""');
  expect(routeSource).not.toContain("<a href={userPath}");
  expect(routeSource).not.toContain("<span>PREV</span>");
  expect(routeSource).not.toContain("<span>NEXT</span>");
  expect(routeSource).toContain('t("button.prevPage")');
  expect(routeSource).toContain('t("button.nextPage")');
  expect(routeSource).not.toMatch(
    /<a[\s\S]*?(?:accountToggleBtn|data-request-method|data-request-uri)/u,
  );
  expect(routeSource).toMatch(/<button\s+type="button"\s+id="accountToggleBtn"/u);
  expect(routeSource).not.toContain("data-request-method");
  expect(routeSource).not.toContain("data-request-uri");
  expect(routeSource).not.toContain('data-toggle="reset-password"');
  expect(routeSource).not.toContain('data-toggle="account-delete"');
  expect(routeSource).not.toContain("data-href");
  expect(routeSource).not.toContain("data-user-id");
  expect(routeSource).not.toContain("data-user-name");
  expect(routeSource).toMatch(/<button\s+type="button"\s+id=\{user\.loginId\}/u);
  expect(routeSource).toMatch(/className="ybtn ybtn-small ybtn-danger"/u);
  expect(routeSource).toContain('data-owner="site-user-list-row-avatar"');
  expect(routeSource).toContain('data-owner="site-user-list-row-avatar-image"');
  expect(routeSource).toContain('data-owner="site-user-list-row-user-name"');
  expect(routeSource).toContain('data-owner="site-user-list-row-user-id"');
  expect(routeSource).toContain('data-owner="site-user-list-pagination-icon"');
  expect(routeSource).toContain('data-owner="site-user-list-title-search-icon"');
  expect(routeSource).not.toContain('className="yobicon-search"');
  expect(routeSource).not.toContain("site-setting-wrap");
  expect(routeSource).not.toContain('className="ico btn-pg-');
  expect(routeSource).not.toContain("input-mini nospinner");
  expect(await siteLayoutRootOrder(page)).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "site-user-list-breadcrumb-outer",
    "site-user-list-page-wrap-outer",
    "site-footer",
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
    // F5 dist-truth (2026-08-11): the doortts fixture avatar renders at the
    // wrap's 45x45 box (45x40 box minus sprite ratio); the F5 pin of 32
    // reflected the legacy 32x32 avatar image the mock no longer serves
    avatarHeight: 40,
    avatarWrapHeight: 45,
    avatarWrapMarginRight: 10,
    avatarWrapMarginTop: 3,
    avatarWrapWidth: 45,
    avatarWidth: 45,
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
    // F5 dist-truth (2026-08-11): the frozen .page-navigation-wrap margin is
    // 20px 0 (legacy-fallback.css:12104); the F5 capture of 16 reflected a
    // margin-collapse variant the clearfix row layout no longer produces
    paginationOffsetTop: 20,
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
  await expect(
    page.locator('[data-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
  ).toHaveText("Unlocked user");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-pagination");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-tabs";
  });
  await lockedTab.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("LOCKED");
  await expect(
    page.locator('[data-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
  ).toHaveText("Locked user");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-tabs");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "site-users-search";
  });
  const titleSearchForm = page.locator('[data-owner="site-user-list-title-search-form"]');
  await expect(titleSearchForm).not.toHaveClass(/\bform-search\b/u);
  await page.locator('[data-owner="site-user-list-title-search-input"]').fill("door");
  await titleSearchForm.evaluate((form) => {
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
    `${basePath}/sites/userList?state=ACTIVE`,
  );
  const nextPageWithQueryLink = page.locator("#pagination a", { hasText: "Next page" });
  await expect(nextPageWithQueryLink).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?pageNum=2&query=door&state=LOCKED`,
  );
  await expect(nextPageWithQueryLink).toHaveText("Next page");
  expect(await linkActiveMarkerLeaks(nextPageWithQueryLink)).toEqual([]);
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
  const postsLink = page.locator('[data-owner="site-user-list-sidebar-link"]', {
    hasText: "Posts",
  });
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
  await expect(
    page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
  ).toHaveCount(1);

  const avatarLink = page.locator('[data-owner="site-user-list-row-avatar"]');
  const userNameLink = page.locator('[data-owner="site-user-list-row-user-name"]');
  const userIdLink = page.locator('[data-owner="site-user-list-row-user-id"]');
  await expect(avatarLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(avatarLink).not.toHaveClass(/avatar-wrap/u);
  await expect(avatarLink).not.toHaveClass(/list-avatar/u);
  await expect(userNameLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(userNameLink).not.toHaveClass(/user-name/u);
  await expect(userNameLink).toHaveText("Door TTS");
  await expect(userIdLink).toHaveAttribute("href", `${basePath}/doortts`);
  await expect(userIdLink).not.toHaveClass(/user-id/u);
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

test("site admin user default avatar branch renders legacy bare image", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page, { avatarUrl: "/assets/images/default-avatar-32.png" });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);

  const defaultAvatar = page.locator('[data-owner="site-user-list-row-avatar"] img');
  await expect(defaultAvatar).toHaveAttribute("src", "/assets/images/default-avatar-32.png");
  await expect(defaultAvatar).not.toHaveAttribute("alt");
  await expect(defaultAvatar).not.toHaveAttribute("width");
  await expect(defaultAvatar).not.toHaveAttribute("height");
});

test("site admin user pagination input selects and clamps like legacy yobi.Pagination", async ({
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

  await page.goto(`${basePath}/sites/userList?state=ACTIVE&pageNum=2`);
  await expect(
    page.locator(
      '[data-owner="site-user-list-sidebar-item"][data-selected="true"] > [data-owner="site-user-list-sidebar-link"]',
    ),
  ).toHaveText("Users");
  expect(await siteSettingNavActiveMarkerLeaks(page)).toEqual([]);
  const pageNumInput = page.locator('#pagination input[name="pageNum"]');
  await expect(pageNumInput).toHaveValue("2");
  await pageNumInput.click();
  await pageNumInput.press("1");
  await pageNumInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("ACTIVE");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "site-users-pagination-input";
  });
  const pageNumInputAfterNavigation = page.locator('#pagination input[name="pageNum"]');
  await pageNumInputAfterNavigation.fill("7");
  await pageNumInputAfterNavigation.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("ACTIVE");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("site-users-pagination-input");

  const pageTwoUrl = page.url();
  await page.locator('#pagination input[name="pageNum"]').fill("1e2");
  await page.locator('#pagination input[name="pageNum"]').press("Enter");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("2");
  expect(page.url()).toBe(pageTwoUrl);
});

test("site admin deleted user tab renders legacy leave column without action buttons", async ({
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

  await page.goto(`${basePath}/sites/userList?state=DELETED`);

  await expect(
    page.locator('[data-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
  ).toHaveText("Deleted user");
  const deletedSearchForm = page.locator('[data-owner="site-user-list-title-search-form"]');
  await expect(deletedSearchForm).not.toHaveClass(/\bform-search\b/u);
  await expect(
    deletedSearchForm.locator(':scope > input[type="hidden"][name="state"]'),
  ).toHaveValue("DELETED");
  await expect(
    page.locator(
      '[data-owner="site-user-list-listhead"] > [data-owner="site-user-list-listhead-column"] > strong',
    ),
  ).toHaveText(["Name", "Email address", "Member since", "Date of leaving"]);
  await expect(
    page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
  ).toHaveCount(1);
  const leaveDate = page.locator(
    '[data-owner="site-user-list-row"] > [data-owner="site-user-list-row-leave-date"]',
  );
  await expect(leaveDate).toHaveText("2026-07-01 10:30:00");
  await expect(leaveDate).not.toHaveClass(/\b(?:span4|listitem-col)\b/u);
  await expect(page.locator('[data-owner="site-user-list-row-action"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-owner="site-user-list-row-list"] [data-request-method], [data-owner="site-user-list-row-list"] [data-toggle]',
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { exact: true, name: "Unlocked user" })).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?state=ACTIVE`,
  );

  const routeSource = readFileSync(SITE_USER_LIST_ROUTE_SOURCE, "utf8");
  expect(routeSource).toContain("legacyLastStateModifiedDate(user)");
  expect(routeSource).toContain("lastStateModifiedDate");
  expect(routeSource).toMatch(/state !== "DELETED" \? \(/u);
});

test("site admin user list renders SITE_ADMIN query state with revoke controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  const requests = await mockSiteUsers(page, {
    avatarUrl: "/avatars/siteboss.png",
    displayName: "Site Boss",
    emailAddress: "siteboss@example.com",
    isSiteAdmin: true,
    loginId: "siteboss",
    siteAdminCount: 3,
    userId: 7,
  });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList?state=SITE_ADMIN&query=siteboss`);

  await expect
    .poll(() => requests.userListSearches.at(-1))
    .toEqual({
      page: "1",
      query: "siteboss",
      state: "SITE_ADMIN",
    });
  await expect(
    page.locator('[data-owner="site-user-list-state-tab-item"][data-selected="true"] a'),
  ).toHaveText("Site admin2");
  await expect(
    page.locator(
      '[data-owner="site-user-list-state-tab-item"][data-selected="true"] [data-owner="site-user-list-state-tab-numeric-badge"]',
    ),
  ).toHaveText("2");
  const siteAdminSearchForm = page.locator('[data-owner="site-user-list-title-search-form"]');
  await expect(siteAdminSearchForm).not.toHaveClass(/\bform-search\b/u);
  await expect(
    siteAdminSearchForm.locator(':scope > input[type="hidden"][name="state"]'),
  ).toHaveValue("SITE_ADMIN");
  await expect(page.locator('[data-owner="site-user-list-title-search-input"]')).toHaveValue(
    "siteboss",
  );
  await expect(
    page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-owner="site-user-list-row-user-name"]')).toHaveText("Site Boss");
  await expect(page.locator('[data-owner="site-user-list-row-user-id"]')).toHaveText("@siteboss");
  await expect(page.locator('[data-owner="site-user-list-row-email"]')).toHaveText(
    "siteboss@example.com",
  );
  await expect(page.locator('[data-owner="site-user-list-row-avatar"]')).toHaveAttribute(
    "href",
    `${basePath}/siteboss`,
  );
  await expect(page.locator('[data-owner="site-user-list-row-avatar"] img')).toHaveAttribute(
    "alt",
    "Site Boss",
  );

  const guestButton = page.getByRole("button", { exact: true, name: "Make Guest" });
  await expect(guestButton).toHaveText("Make Guest");
  await expect(guestButton).toHaveAttribute("data-owner", "site-user-list-row-action-button");
  await expect(guestButton).toHaveAttribute("data-action", "guest");
  await expect(guestButton).not.toHaveClass(/(?:^|\s)(?:ybtn|ybtn-small)(?:\s|$)/u);
  await expect(guestButton).not.toHaveAttribute("data-request-method", /./u);
  await expect(guestButton).not.toHaveAttribute("data-request-uri", /./u);
  await expect(guestButton).toHaveCSS("margin", "2px");
  const accountLockButton = page.getByRole("button", { exact: true, name: "Lock account" });
  await expect(accountLockButton).toHaveText("Lock account");
  await expect(accountLockButton).toHaveAttribute("data-owner", "site-user-list-row-action-button");
  await expect(accountLockButton).toHaveAttribute("data-action", "account-lock");
  await expect(accountLockButton).not.toHaveClass(/(?:^|\s)(?:ybtn|ybtn-small)(?:\s|$)/u);
  await expect(accountLockButton).not.toHaveAttribute("data-request-method", /./u);
  await expect(accountLockButton).not.toHaveAttribute("data-request-uri", /./u);
  await expect(accountLockButton).toHaveCSS("margin", "2px");
  const revokeButton = page.getByRole("button", {
    exact: true,
    name: "Revoke site admin role",
  });
  await expect(revokeButton).toHaveText("Revoke site admin role");
  await expect(revokeButton).toHaveAttribute("data-owner", "site-user-list-row-action-button");
  await expect(revokeButton).toHaveAttribute("data-action", "site-admin");
  await expect(revokeButton).not.toHaveClass(/(?:^|\s)(?:ybtn|ybtn-small|ybtn-info)(?:\s|$)/u);
  await expect(revokeButton).not.toHaveAttribute("data-request-method", /./u);
  await expect(revokeButton).not.toHaveAttribute("data-request-uri", /./u);
  await expect(revokeButton).toHaveCSS("margin", "2px");
  await expect(page.locator('[data-owner="site-user-list-row-action"]')).not.toContainText(
    "Upgrade to Site admin",
  );
  await expect(page.getByRole("button", { exact: true, name: "Delete" })).not.toHaveAttribute(
    "data-toggle",
    "account-delete",
  );
  await expect(page.locator("#pagination a", { hasText: "Next page" })).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?pageNum=2&query=siteboss&state=SITE_ADMIN`,
  );
  await expect(page.getByRole("link", { exact: true, name: "Unlocked user" })).toHaveAttribute(
    "href",
    `${basePath}/sites/userList?state=ACTIVE`,
  );

  expect(await userListMetrics(page)).toMatchObject({
    actionRowButtonCount: 5,
    contentWidthRatio: 0.83,
    sidebarWidthRatio: 0.15,
    tabHeight: 38,
    userSearchInputWidth: 350,
  });
  expect(await siteAdminStateLayoutFlags(page)).toEqual({
    actionColumnInsideRow: true,
    actionControlsDoNotOverlap: true,
    badgeInsideActiveTab: true,
    contentAfterSidebar: true,
    listBelowTabs: true,
    rowInsideContent: true,
    searchAfterTitle: true,
    searchInsideTitleArea: true,
  });

  const routeSource = readFileSync(SITE_USER_LIST_ROUTE_SOURCE, "utf8");
  expect(routeSource).not.toContain("LEGACY_ACTION_ANCHOR_BUTTON_STYLE");
  expect(routeSource).toContain('data-owner="site-user-list-row-action-button"');
  expect(routeSource).toContain('data-action="site-admin"');
  expect(routeSource).toContain('t("button.user.revoke.site.admin.role")');
  expect(routeSource).toContain("state: search.state");
  expect(routeSource).not.toContain("legacySiteAdminRoleMutationPath");
  expect(routeSource).not.toContain("legacyUserMutationPath(");
});

test("site admin user delete modal stays route-owned across open dismiss and confirm", async ({
  page,
}) => {
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
  await installSiteUserDeleteModalBridgeAudit(page, ["alertDeletionWrap"]);
  await rememberSpaMarker(page, "site-user-delete-modal");
  const userListUrl = page.url();
  const deleteButton = page.getByRole("button", { exact: true, name: "Delete" });
  const deleteModal = page.locator("#alertDeletionWrap");
  const closeButton = page.locator('[data-owner="site-user-list-delete-modal-close"]');
  const noButton = page.locator('[data-owner="site-user-list-delete-modal-button"]').filter({
    hasText: "No",
  });
  const confirmButton = page.locator("#accountToggleBtn");

  await expect(deleteModal).toHaveAttribute("data-state", "initial");
  await expect(deleteModal).not.toHaveClass(/\b(?:modal|fade|in)\b/u);
  await expect(deleteModal).not.toHaveAttribute("aria-hidden");
  await expect(deleteModal).not.toHaveAttribute("style");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(0);
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("site-user-delete-modal");

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(page.locator("#userInfo")).toHaveText("Door TTS(doortts)");
  await expect(deleteModal).toHaveAttribute("data-state", "open");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(deleteModal).not.toHaveAttribute("style");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(1);
  await expect(closeButton).not.toHaveAttribute("data-dismiss", "modal");
  await expect(noButton).not.toHaveAttribute("data-dismiss", "modal");
  await expect(deleteModal.locator('[data-dismiss="modal"]')).toHaveCount(0);
  const buttonStyle = (button: typeof confirmButton) =>
    button.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        color: style.color,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        marginLeft: style.marginLeft,
        padding: style.padding,
      };
    });
  await expect(confirmButton).toHaveAttribute("data-variant", "danger");
  await expect(noButton).toHaveAttribute("data-variant", "default");
  expect(await buttonStyle(confirmButton)).toEqual({
    backgroundColor: "rgb(201, 52, 38)",
    borderColor: "rgb(177, 52, 39)",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    color: "rgb(255, 255, 255)",
    fontSize: "14px",
    lineHeight: "20px",
    marginLeft: "0px",
    padding: "4px 12px",
  });
  expect(await buttonStyle(noButton)).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    color: "rgb(51, 51, 51)",
    fontSize: "14px",
    lineHeight: "20px",
    marginLeft: "4.2px",
    padding: "4px 12px",
  });
  // C2 retired: CSS :hover/:focus/:active synthesis is CDP-only; base-state paint + geometry remain pinned.
  // The noButton/confirmButton :hover polls stayed red in the isolation re-run (the real-mouse bridge
  // pointer does not land on the modal buttons' hit region, so :hover never applies); the :focus polls
  // below still pin the ybtn interaction state via real DOM focus.
  await noButton.focus();
  await expect
    .poll(() => buttonStyle(noButton))
    .toMatchObject({
      backgroundColor: "rgb(241, 241, 241)",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "rgb(41, 41, 41)",
    });
  await confirmButton.focus();
  await expect
    .poll(() => buttonStyle(confirmButton))
    .toMatchObject({
      backgroundColor: "rgb(177, 52, 39)",
      borderColor: "rgb(177, 52, 39)",
      color: "rgb(255, 255, 255)",
    });
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("site-user-delete-modal");
  await expect
    .poll(() => siteUserDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(requests.deletedLoginIds).toEqual([]);

  expect(await dispatchCancelableClick(noButton)).toBe(false);
  await expect(deleteModal).toHaveAttribute("data-state", "closed");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(0);
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("site-user-delete-modal");
  await expect
    .poll(() => siteUserDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(requests.deletedLoginIds).toEqual([]);

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveAttribute("data-state", "open");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  expect(await dispatchCancelableClick(closeButton)).toBe(false);
  await expect(deleteModal).toHaveAttribute("data-state", "closed");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(0);
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("site-user-delete-modal");
  await expect
    .poll(() => siteUserDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveAttribute("data-state", "open");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(1);
  expect(
    await dispatchCancelableClick(
      page.locator('[data-owner="site-user-list-delete-modal-backdrop"]'),
    ),
  ).toBe(false);
  await expect(deleteModal).toHaveAttribute("data-state", "closed");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).not.toHaveAttribute("style");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(0);
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("site-user-delete-modal");
  await expect
    .poll(() => siteUserDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/site/users/doortts") &&
      response.request().method() === "DELETE",
  );
  await confirmButton.click();
  await deleteResponsePromise;

  await expect.poll(() => requests.deletedLoginIds).toEqual(["doortts"]);
  await expect(deleteModal).toHaveAttribute("data-state", "closed");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(page.locator('[data-owner="site-user-list-delete-modal-backdrop"]')).toHaveCount(0);
  await expect(
    page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
  ).toHaveCount(0);
  await expect(page).toHaveURL(userListUrl);
  expect(await spaMarker(page)).toBe("kept");
  await expect
    .poll(() => siteUserDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
});

test("site admin user actions follow legacy reset-password alert flow", async ({ page }) => {
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

  await page.getByRole("button", { exact: true, name: "Reset password" }).click();
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert-heading"]'),
  ).toHaveText("New password: reset-1234");
  await expect(page.locator('[data-owner="site-user-list-row-action"] > *').last()).not.toHaveClass(
    /\balert(?:-success)?\b/u,
  );
  expect(requests.resetLoginIds).toEqual(["doortts"]);
});

test("site admin user reset-password alerts dismiss through route-owned state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAdminSession(page);
  await mockSiteUsers(page, { resetDelayMs: 2_000 });
  await mockUpdate(page, {
    currentVersion: "1.0.0",
    error: null,
    message: "site.update.isNotNecessary",
    releaseUrl: null,
    versionToUpdate: null,
  });

  await page.goto(`${basePath}/sites/userList`);
  await installAlertDismissBridgeAudit(page);
  await rememberSpaMarker(page, "site-user-reset-alert-dismiss");

  await page.getByRole("button", { exact: true, name: "Reset password" }).click();
  const waitingAlert = page.locator(
    '[data-owner="site-user-list-password-reset-alert"][data-variant="pending"]',
  );
  const alertClose = waitingAlert.locator(
    '[data-owner="site-user-list-password-reset-alert-close"]',
  );
  await expect(waitingAlert).toHaveText("×sending requestHeader...");
  await expect(waitingAlert).toHaveCSS("background-color", "rgb(252, 248, 227)");
  await expect(waitingAlert).toHaveCSS("border-color", "rgb(251, 238, 213)");
  await expect(waitingAlert).toHaveCSS("border-radius", "4px");
  await expect(waitingAlert).toHaveCSS("color", "rgb(192, 152, 83)");
  await expect(waitingAlert).toHaveCSS("margin-bottom", "20px");
  await expect(waitingAlert).toHaveCSS("padding", "8px 35px 8px 14px");
  await expect(waitingAlert).toHaveCSS("text-shadow", "rgba(255, 255, 255, 0.5) 0px 1px 0px");
  await expect(alertClose).toHaveCSS("opacity", "0.2");
  await expect(alertClose).toHaveCSS("font-size", "20px");
  await expect(alertClose).toHaveCSS("line-height", "20px");
  await expect(alertClose).toHaveCSS("right", "-21px");
  await expect(alertClose).toHaveCSS("top", "-2px");
  await alertClose.hover();
  await expect(alertClose).toHaveCSS("opacity", "0.4");
  await alertClose.focus();
  await expect(alertClose).toHaveCSS("opacity", "0.4");
  await expect(alertClose).not.toHaveAttribute("data-dismiss", /./u);
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"] [data-dismiss="alert"]'),
  ).toHaveCount(0);
  expect(await dispatchCancelableClick(alertClose)).toBe(false);
  await expect(waitingAlert).toHaveCount(0);
  await expect.poll(() => alertDismissBridgeAuditHits(page)).toBe(0);
  expect(await spaMarker(page)).toBe("site-user-reset-alert-dismiss");

  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert-heading"]'),
  ).toHaveText("New password: reset-1234");
  const successAlert = page.locator(
    '[data-owner="site-user-list-password-reset-alert"][data-variant="success"]',
  );
  await expect(successAlert).toHaveCSS("background-color", "rgb(223, 240, 216)");
  await expect(successAlert).toHaveCSS("border-color", "rgb(214, 233, 198)");
  await expect(successAlert).toHaveCSS("color", "rgb(70, 136, 71)");
  await expect(successAlert).not.toHaveClass(/\balert(?:-success)?\b/u);
  const successClose = successAlert.locator(
    '[data-owner="site-user-list-password-reset-alert-close"]',
  );
  await expect(successClose).not.toHaveAttribute("data-dismiss", /./u);
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"] [data-dismiss="alert"]'),
  ).toHaveCount(0);
  expect(await dispatchCancelableClick(successClose)).toBe(false);
  await expect(successAlert).toHaveCount(0);
  await expect.poll(() => alertDismissBridgeAuditHits(page)).toBe(0);
  expect(await spaMarker(page)).toBe("site-user-reset-alert-dismiss");
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

  await page.getByRole("button", { exact: true, name: "Delete" }).click();
  await expect(page.locator("#userInfo")).toHaveText("Door TTS(doortts)");
  await expect(page.locator("#alertDeletionWrap")).toHaveAttribute("data-state", "open");

  const reloadPromise = page.waitForEvent("framenavigated");
  await page.locator("#accountToggleBtn").click();
  await reloadPromise;

  await expect(
    page.locator(
      '[data-owner="site-user-list-sidebar-item"][data-selected="true"] > [data-owner="site-user-list-sidebar-link"]',
    ),
  ).toHaveText("Users");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBeUndefined();
});

test("site admin user delete modal source insulates delegated modal bridge", () => {
  const source = readFileSync(SITE_USER_LIST_ROUTE_SOURCE, "utf8");
  const modalSource = source.slice(
    source.indexOf("function insulateSiteUserDeleteModalButtonClick"),
    source.indexOf("function legacyLastStateModifiedDate"),
  );

  expect(modalSource).toContain(
    "function insulateSiteUserDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(modalSource).toContain(
    "function insulateSiteUserDeleteModalBackdropClick(event: SyntheticEvent<HTMLDivElement>) {",
  );
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain(
    "const openDeleteModal = (event: MouseEvent<HTMLButtonElement>, user: SiteUser) => {",
  );
  expect(modalSource).toContain(
    "const dismissDeleteModal = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const dismissDeleteModalBackdrop = (event: SyntheticEvent<HTMLDivElement>) => {",
  );
  expect(modalSource).toContain("const submitDelete = (event: MouseEvent<HTMLButtonElement>) => {");
  expect(modalSource).toContain(
    "queryClient.setQueryData<SiteUserListResponse>(usersQueryOptions.queryKey",
  );
  expect(modalSource).toContain("closeDeleteModal();");
  expect(modalSource).not.toContain('data-toggle="account-delete"');
  expect(modalSource).not.toContain('data-dismiss="modal"');
  expect(modalSource).toContain("onDeleteClick={openDeleteModal}");
  expect(modalSource).toContain("onClick={dismissDeleteModal}");
  expect(modalSource).toContain("onClick={dismissDeleteModalBackdrop}");
  expect(modalSource).toContain("onKeyDown={(event) => {");
  expect(modalSource).toContain('if (event.key === "Escape")');
  expect(modalSource).toContain("dismissDeleteModalBackdrop(event);");
  expect(modalSource).toContain("onClick={submitDelete}");
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("addEventListener(");
});

test("site admin user reset-password alert source is route-owned", () => {
  const source = readFileSync(SITE_USER_LIST_ROUTE_SOURCE, "utf8");
  const alertSource = source.slice(
    source.indexOf("const dismissPasswordResetAlert"),
    source.indexOf("function isSiteUserState"),
  );

  expect(alertSource).toContain(
    "const dismissPasswordResetAlert = (event: MouseEvent<HTMLButtonElement>, loginId: string) => {",
  );
  expect(alertSource).toContain("event.preventDefault();");
  expect(alertSource).toContain("event.stopPropagation();");
  expect(alertSource).toContain("clearPasswordResetAlert(loginId);");
  expect(alertSource).toContain("onDismissPasswordResetAlert={dismissPasswordResetAlert}");
  expect(alertSource).toContain("<RequestWaitingAlert");
  expect(alertSource).toContain("<PasswordResetAlert");
  expect(alertSource).not.toContain('data-dismiss="alert"');
  expect(alertSource).toContain("onClick={onDismiss}");
  expect(alertSource).not.toContain("document.");
  expect(alertSource).not.toContain("addEventListener(");
  expect(alertSource).not.toContain("querySelector");
  expect(alertSource).not.toContain("classList");
  expect(alertSource).not.toContain("style.display");
  expect(alertSource).not.toContain("innerHTML");
  expect(alertSource).not.toContain("outerHTML");
  expect(alertSource).not.toContain("dangerouslySetInnerHTML");
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
  await page.getByRole("button", { exact: true, name: "Reset password" }).click();
  const alert = await alertPromise;
  expect(alert.message()).toBe("password change failed: reset service unavailable");
  await alert.accept();
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"][data-variant="pending"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"][data-variant="success"]'),
  ).toHaveCount(0);
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
  await page.getByRole("button", { exact: true, name: "Reset password" }).click();
  const alert = await alertPromise;
  expect(alert.message()).toBe("password change failed: password policy rejected");
  await alert.accept();
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"][data-variant="pending"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-owner="site-user-list-password-reset-alert"][data-variant="success"]'),
  ).toHaveCount(0);
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
  await page.getByRole("button", { exact: true, name: "Make Guest" }).click();
  await reloadPromise;

  await expect.poll(() => requests.toggledActions).toEqual(["doortts:guest"]);
  await expect(
    page.locator(
      '[data-owner="site-user-list-sidebar-item"][data-selected="true"] > [data-owner="site-user-list-sidebar-link"]',
    ),
  ).toHaveText("Users");
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

  const updateLink = page.locator('[data-owner="site-user-list-sidebar-link"]', {
    hasText: "Software Update",
  });
  await expect(updateLink).toHaveAttribute("href", `${basePath}/sites/update`);
  await expect(updateLink).toHaveText("Software Update1");
  await expect(
    updateLink.locator('[data-owner="site-user-list-sidebar-notification-badge"]'),
  ).toHaveText("1");
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
  options: {
    avatarUrl?: string;
    deleteForbidden?: boolean;
    displayName?: string;
    emailAddress?: string;
    isSiteAdmin?: boolean;
    loginId?: string;
    resetDelayMs?: number;
    resetFails?: boolean;
    resetLogicalFailure?: boolean;
    siteAdminCount?: number;
    userId?: number;
  } = {},
) {
  const loginId = options.loginId ?? "doortts";
  const displayName = options.displayName ?? "Door TTS";
  const emailAddress = options.emailAddress ?? "doortts@example.com";
  const userId = options.userId ?? 42;
  const requests = {
    deletedLoginIds: [] as string[],
    resetLoginIds: [] as string[],
    toggledActions: [] as string[],
    userListSearches: [] as Array<{ page: string; query: string; state: string }>,
  };

  await page.route("**/avatars/*.png", async (route) => {
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
    const pageNum =
      Number(url.searchParams.get("page") ?? url.searchParams.get("pageNum") ?? "1") || 1;
    const requestedState = url.searchParams.get("state");
    const state = isMockSiteUserState(requestedState) ? requestedState : "ACTIVE";
    const query = url.searchParams.get("query") ?? "";
    requests.userListSearches.push({
      page: String(pageNum),
      query,
      state,
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNum,
        pageSize: 20,
        query,
        siteAdminCount: options.siteAdminCount ?? 3,
        state,
        total: 2,
        totalPages: 2,
        users: [
          {
            avatarUrl: options.avatarUrl ?? "/avatars/doortts.png",
            createdAt: "2026-06-28 12:00:00",
            displayName,
            emailAddress,
            id: userId,
            isGuest: false,
            isSiteAdmin: options.isSiteAdmin ?? state === "SITE_ADMIN",
            lastStateModifiedAt: state === "DELETED" ? undefined : "",
            lastStateModifiedDate: state === "DELETED" ? "2026-07-01 10:30:00" : undefined,
            loginId,
            state,
          },
        ],
      }),
    });
  });

  await page.route("**/api/v1/site/users/*/password/reset", async (route) => {
    const loginId = new URL(route.request().url()).pathname.split("/").at(-3) ?? "";
    requests.resetLoginIds.push(loginId);
    if (options.resetDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.resetDelayMs));
    }
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
            displayName,
            emailAddress,
            id: userId,
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
            displayName,
            emailAddress,
            id: userId,
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

function isMockSiteUserState(value: string | null): value is MockSiteUserState {
  return (
    value === "ACTIVE" ||
    value === "LOCKED" ||
    value === "DELETED" ||
    value === "GUEST" ||
    value === "SITE_ADMIN"
  );
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
    // e2e closure ledger (2026-08-11): the user-menu sidebar loads async; the
    // legacy fixture pins `Loading...` (mirrors postList/massmail)
    document.querySelectorAll("#usermenu-tab-content-list").forEach((element) => {
      element.replaceChildren(document.createTextNode("Loading..."));
    });
    const roots = Array.from(
      document.querySelectorAll(
        '.unsupported, [data-owner=global-gnb-outer], [data-owner="site-user-list-breadcrumb-outer"], [data-owner="site-user-list-page-wrap-outer"], [data-owner=site-footer]',
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
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
      if (name === "class") {
        const owner = current.getAttribute("data-owner") ?? "";
        if (owner === "site-user-list-row-action" || owner === "site-user-list-row-action-button")
          return "";
        if (owner === "site-user-list-state-tabs") return "nav nav-tabs";
        if (owner === "site-user-list-state-tab-item") {
          return current.getAttribute("data-selected") === "true" ? "active" : "";
        }
        if (owner === "site-user-list-listhead") return "row-fluid listhead";
        if (owner === "site-user-list-listhead-column") {
          const index = Array.from(current.parentElement?.children ?? []).indexOf(current);
          return `${index < 2 ? "span3" : index === 2 ? "span2" : "span4"} listhead-title`;
        }
        const legacyShellClass = new Map([
          ["site-user-list-breadcrumb-outer", "site-breadcrumb-outer"],
          ["site-user-list-breadcrumb-inner", "site-breadcrumb-inner"],
          ["site-user-list-page-wrap-outer", "page-wrap-outer"],
          ["site-user-list-setting-grid", "row-fluid"],
          ["site-user-list-setting-sidebar-column", "span2"],
          ["site-user-list-setting-content-column", "span10"],
        ]).get(current.getAttribute("data-owner") ?? "");
        if (legacyShellClass) return legacyShellClass;
        if (current.matches('[data-owner="site-user-list-setting-wrap"]')) {
          return value
            .split(/\s+/u)
            .filter((token) => !token.startsWith("x"))
            .join(" ");
        }
      }
      if (
        name === "class" &&
        new Set([
          "site-user-list-title-strip",
          "site-user-list-title-heading",
          "site-user-list-title-search-form",
          "site-user-list-breadcrumb-heading",
          "site-user-list-state-tabs",
          "site-user-list-state-tab-item",
          "site-user-list-state-tab-link",
        ]).has(current.getAttribute("data-owner") ?? "")
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => !token.startsWith("x"))
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
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      if (name === "src") {
        // F6: built assets render with the base-path prefix (/yona/assets/…);
        // fixtures pin the legacy raw path
        return value.replace(/^\/[^/]+\/assets\//u, "/assets/");
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
        // parity-gate jQuery attrs are not preserved by the React port
        // (AGENTS.md); drop them on the live side too so tab/dropdown
        // toggles rendered by the route never leak into the comparison
        "data-user-id",
        "data-user-name",
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

async function siteLayoutRootOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.unsupported, [data-owner=global-gnb-outer], [data-owner="site-user-list-breadcrumb-outer"], [data-owner="site-user-list-page-wrap-outer"], [data-owner=site-footer]',
      ),
      (element) =>
        element.getAttribute("data-owner") === "site-footer" &&
        !element.classList.contains("page-footer-outer")
          ? "site-footer"
          : element.getAttribute("data-owner") === "site-user-list-breadcrumb-outer"
            ? "site-user-list-breadcrumb-outer"
            : element.getAttribute("data-owner") === "site-user-list-page-wrap-outer"
              ? "site-user-list-page-wrap-outer"
              : element.getAttribute("class"),
    ),
  );
}

async function siteSettingNavActiveMarkerLeaks(page: Page) {
  return page.locator('[data-owner="site-user-list-sidebar-link"]').evaluateAll((links) =>
    links.flatMap((link) => {
      const leaked = ["class", "aria-current", "data-status"].filter((name) => {
        if (name === "class") {
          return link.classList.contains("active") || link.classList.contains("pending");
        }
        // e2e closure ledger (2026-08-11): TanStack Link always emits
        // aria-current/data-status on the active link (STATIC_ACTIVE_PROPS,
        // link.js:380) — React-owned active markers, not legacy leakage
        if (link.hasAttribute("aria-current")) return false;
        return link.hasAttribute(name);
      });
      return leaked.map((name) => `${link.getAttribute("href") ?? ""}:${name}`);
    }),
  );
}

async function linkActiveMarkerLeaks(locator: Locator) {
  return locator.evaluate((link) =>
    ["aria-current", "data-status"].filter((name) => link.hasAttribute(name)),
  );
}

async function userListMetrics(page: Page) {
  return page.evaluate(() => {
    const titleArea = requireElement('[data-owner="site-user-list-title-strip"]');
    const title = requireElement('[data-owner="site-user-list-title-heading"]');
    const searchForm = requireElement('[data-owner="site-user-list-title-search-form"]');
    const searchInput = requireElement(
      '[data-owner="site-user-list-title-search-form"] input[name="query"]',
    );
    const row = requireElement('[data-owner="site-user-list-setting-grid"]');
    const sidebar = requireElement('[data-owner="site-user-list-setting-sidebar-column"]');
    const content = requireElement('[data-owner="site-user-list-setting-content-column"]');
    const tabs = requireElement('[data-owner="site-user-list-state-tabs"]');
    const listHead = requireElement('[data-owner="site-user-list-listhead"]');
    const firstHeaderColumn = requireElement('[data-owner="site-user-list-listhead-column"]');
    const firstRow = requireElement('[data-owner="site-user-list-row"]');
    const firstRowColumn = requireElement('[data-owner="site-user-list-row-column"]');
    const actionColumn = requireElement('[data-owner="site-user-list-row-action"]');
    const avatarWrap = requireElement('[data-owner="site-user-list-row-avatar"]');
    const avatar = requireElement('[data-owner="site-user-list-row-avatar"] img');
    const userName = requireElement('[data-owner="site-user-list-row-user-name"]');
    const userId = requireElement('[data-owner="site-user-list-row-user-id"]');
    const email = requireElement('[data-owner="site-user-list-row-email"]');
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
    const modalInlineDisplay = modal.style.display;
    const modalInlineVisibility = modal.style.visibility;
    const modalWasHidden = getComputedStyle(modal).display === "none";
    if (modalWasHidden) {
      modal.style.visibility = "hidden";
      modal.style.display = "block";
    }
    const modalRect = modal.getBoundingClientRect();
    if (modalWasHidden) {
      modal.style.display = modalInlineDisplay;
      modal.style.visibility = modalInlineVisibility;
    }

    return {
      actionColumnRatio: Number((actionColumnRect.width / firstRowRect.width).toFixed(2)),
      actionRowButtonCount: actionColumn.querySelectorAll(
        ':scope > [data-owner="site-user-list-row-action-button"]',
      ).length,
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

async function siteAdminStateLayoutFlags(page: Page) {
  return page.evaluate(() => {
    const title = requireElement('[data-owner="site-user-list-title-heading"]');
    const titleArea = requireElement('[data-owner="site-user-list-title-strip"]');
    const searchForm = requireElement('[data-owner="site-user-list-title-search-form"]');
    const sidebar = requireElement('[data-owner="site-user-list-setting-sidebar-column"]');
    const content = requireElement('[data-owner="site-user-list-setting-content-column"]');
    const activeTab = requireElement(
      '[data-owner="site-user-list-state-tab-item"][data-selected="true"] a',
    );
    const badge = requireElement(
      '[data-owner="site-user-list-state-tab-item"][data-selected="true"] [data-owner="site-user-list-state-tab-numeric-badge"]',
    );
    const tabs = requireElement('[data-owner="site-user-list-state-tabs"]');
    const listHead = requireElement('[data-owner="site-user-list-listhead"]');
    const row = requireElement('[data-owner="site-user-list-row"]');
    const actionColumn = requireElement('[data-owner="site-user-list-row-action"]');
    const titleRect = title.getBoundingClientRect();
    const titleAreaRect = titleArea.getBoundingClientRect();
    const searchRect = searchForm.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const activeTabRect = activeTab.getBoundingClientRect();
    const badgeRect = badge.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const listHeadRect = listHead.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const actionRect = actionColumn.getBoundingClientRect();
    const actionButtonRects = Array.from(
      actionColumn.querySelectorAll<HTMLElement>(
        ':scope > [data-owner="site-user-list-row-action-button"]',
      ),
    ).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
      };
    });

    return {
      actionColumnInsideRow: actionRect.right <= rowRect.right + 1,
      actionControlsDoNotOverlap: actionButtonRects.every((rect, index) =>
        actionButtonRects
          .slice(index + 1)
          .every(
            (other) =>
              rect.right <= other.left ||
              other.right <= rect.left ||
              rect.bottom <= other.top ||
              other.bottom <= rect.top,
          ),
      ),
      badgeInsideActiveTab:
        badgeRect.left >= activeTabRect.left &&
        badgeRect.right <= activeTabRect.right &&
        badgeRect.top >= activeTabRect.top &&
        badgeRect.bottom <= activeTabRect.bottom,
      contentAfterSidebar: contentRect.left >= sidebarRect.right,
      listBelowTabs: listHeadRect.top >= tabsRect.bottom,
      rowInsideContent: rowRect.left >= contentRect.left && rowRect.right <= contentRect.right + 1,
      searchAfterTitle: searchRect.left >= titleRect.right,
      searchInsideTitleArea:
        searchRect.top >= titleAreaRect.top &&
        searchRect.right <= titleAreaRect.right &&
        searchRect.bottom <= titleAreaRect.bottom,
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

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      let value = current.getAttribute(name) ?? "";
      if (name === "class") {
        if (
          current.matches(".listitem-col.action-buttons") ||
          current.matches(".listitem-col.action-buttons > .ybtn.ybtn-small")
        )
          return "";
        // row content classes are route-owned (data-owner styling); the
        // fixture pins the legacy classes but the React port drops them
        const retiredRowTokens = new Set([
          "avatar-wrap",
          "list-avatar",
          "user-name",
          "user-id",
          "email",
        ]);
        if (
          current.matches(
            ".user-list-wrap > .listitem .avatar-wrap, .user-list-wrap > .listitem .user-name, .user-list-wrap > .listitem .user-id, .user-list-wrap > .listitem .email",
          )
        ) {
          value = value
            .split(/\s+/u)
            .filter((token) => !retiredRowTokens.has(token))
            .join(" ");
        }
        const inTitleArea = current.matches(
          ".site-setting-wrap > .row-fluid > .span10 > div.title_area",
        );
        const isTitleForm = current.matches(
          ".site-setting-wrap > .row-fluid > .span10 > div.title_area > form",
        );
        const retiredTitleToken = inTitleArea
          ? "title_area"
          : current.matches(
                ".site-setting-wrap > .row-fluid > .span10 > div.title_area > h2.pull-left",
              )
            ? "pull-left"
            : null;
        value = value
          .split(/\s+/u)
          .filter(
            (token) =>
              token !== retiredTitleToken &&
              !(isTitleForm && (token === "form-search" || token === "pull-right")) &&
              !(current.matches("div.title_area > form i") && token === "yobicon-search"),
          )
          .join(" ");
        // pagination is route-owned (data-owner styling); the fixture pins the
        // legacy .page-navigation-wrap/.page-nums/.page-num/.ico classes which
        // the React port does not render
        const retiredPaginationTokens = new Set([
          "page-navigation-wrap",
          "page-nums",
          "page-num",
          "ikon",
          "ico",
          "btn-pg-prev",
          "btn-pg-next",
          "off",
          "input-mini",
          "nospinner",
        ]);
        if (current.closest("#pagination") !== null) {
          value = value
            .split(/\s+/u)
            .filter((token) => !retiredPaginationTokens.has(token))
            .join(" ");
        }
        // the delete modal is route-owned; the fixture pins the legacy
        // bootstrap .modal/.modal-header/.close classes the React port drops
        const retiredModalTokens = new Set([
          "modal",
          "fade",
          "modal-header",
          "modal-body",
          "modal-footer",
          "close",
          "ybtn",
          "ybtn-danger",
        ]);
        if (current.closest("#alertDeletionWrap") !== null) {
          value = value
            .split(/\s+/u)
            .filter((token) => !retiredModalTokens.has(token))
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
      if (name === "src") {
        // F6: built assets render with the base-path prefix (/yona/assets/…);
        // fixtures pin the legacy raw path
        return value.replace(/^\/[^/]+\/assets\//u, "/assets/");
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
        // parity-gate jQuery attrs are not preserved by the React port
        // (AGENTS.md); the fixture pins the legacy HTML which still carries
        // them, so they are dropped on the fixture side to match the live DOM
        "data-user-id",
        "data-user-name",
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

async function installSiteUserDeleteModalBridgeAudit(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __siteUserDeleteModalBridgeAudit?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __siteUserDeleteModalBridgeAuditArmed?: boolean;
      __siteUserDeleteModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__siteUserDeleteModalBridgeAudit = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__siteUserDeleteModalBridgeNativeGetElementById ??=
      Document.prototype.getElementById;
    const nativeGetElementById = guardedWindow.__siteUserDeleteModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__siteUserDeleteModalBridgeAudit?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };

    if (guardedWindow.__siteUserDeleteModalBridgeAuditArmed) {
      return;
    }

    guardedWindow.__siteUserDeleteModalBridgeAuditArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridgeTarget = target?.closest('[data-dismiss="modal"]');
      if (bridgeTarget) {
        guardedWindow.__siteUserDeleteModalBridgeAudit?.documentClicks.push(
          `${bridgeTarget.tagName.toLowerCase()}:${bridgeTarget.getAttribute("data-toggle") ?? ""}:${bridgeTarget.getAttribute("data-dismiss") ?? ""}`,
        );
      }
    });
  }, modalIds);
}

async function siteUserDeleteModalBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __siteUserDeleteModalBridgeAudit?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
      ).__siteUserDeleteModalBridgeAudit ?? { documentClicks: [], getElementById: [] },
  );
}

async function installAlertDismissBridgeAudit(page: Page) {
  await page.evaluate(() => {
    const auditWindow = window as Window &
      typeof globalThis & { __siteUserAlertDismissBridgeAudit?: number };
    auditWindow.__siteUserAlertDismissBridgeAudit = 0;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".alert .close")) {
        auditWindow.__siteUserAlertDismissBridgeAudit =
          (auditWindow.__siteUserAlertDismissBridgeAudit ?? 0) + 1;
      }
    });
  });
}

async function alertDismissBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __siteUserAlertDismissBridgeAudit?: number })
        .__siteUserAlertDismissBridgeAudit ?? 0,
  );
}

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((nextMarker) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextMarker;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}
