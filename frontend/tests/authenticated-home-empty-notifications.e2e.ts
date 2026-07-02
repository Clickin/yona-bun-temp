import { expect, test, type Page } from "@playwright/test";

const EXPECTED_AUTHENTICATED_HOME = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<div class="admin-logged-in-affix" data-spy="affix" data-offset-top="30">You are Admin now! <span class="small-font">With great power comes great responsibility</span></div>
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
          <span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
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
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </a>
      </li>
      <li class="gnb-usermenu-dropdown">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </a>
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
<div class="page-wrap-outer">
  <div class="page-wrap">
    <div class="site-guide-outer">
      <h3>
        <span>Tada! Welcome to Yona! - Web-based platform for collaborative software development</span>
      </h3>
      <table class="welcome-table table borderless">
        <tbody>
          <tr>
            <td><a href="__BASE_PATH__/projects/new" class="ybtn ybtn-success">Create new project</a></td>
            <td>Create your own project</td>
          </tr>
          <tr>
            <td><a href="__BASE_PATH__/organizations/new" class="ybtn ybtn-success">New Group</a></td>
            <td>If you want to make a group and work with other members, then create a group</td>
          </tr>
          <tr>
            <td><a href="__BASE_PATH__/projects" class="ybtn ybtn-success">Project list</a></td>
            <td>Find a project in which you are interested</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="guide-toggle">
      <button class="btn-transparent" id="toggleIntro" type="button"><i class="yobicon-resizev"></i></button>
    </div>
    <div class="page on-fold-intro">
      <div class="row-fluid content-container">
        <div class="span8 main-stream">
          <ul class="nav nav-tabs">
            <li class="active"><a href="__BASE_PATH__/notifications">Notification</a></li>
            <li><a href="__BASE_PATH__/issues">My Issues</a></li>
            <li><a href="__BASE_PATH__/user/files">My Files</a></li>
            <li></li>
          </ul>
          <ul class="activity-streams notification-wrap unstyled">
            <div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>
          </ul>
        </div>
        <div class="span4 index-menu right-menu span-hard-wrap"></div>
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

const EXPECTED_DIRECT_NOTIFICATIONS = EXPECTED_AUTHENTICATED_HOME.replace(
  `<li></li>
          </ul>`,
  `<li><button id="setDefaultLoginPage" class="ybtn hide-in-mobile" type="button" data-url="notifications" title="Set to default page" data-trigger="hover" data-placement="bottom" data-toggle="popover" data-content="Make current page the index page when logged in">Set to default page</button></li>
          </ul>`,
);

const EXPECTED_DIRECT_NOTIFICATIONS_WITH_NOTIFICATION = EXPECTED_DIRECT_NOTIFICATIONS.replace(
  `<div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>`,
  `<li class="notification-stream">
    <div class="stream-type comment2"><i class="yobicon-comment2"></i></div>
    <div class="stream-desc" data-target="message-42" data-toggle="learnmore">
      <div class="stream-info">
        <div class="title"><a href="__BASE_PATH__/admin/sample/issue/1">Issue #1 updated</a></div>
        <div class="message-wrap nowrap" id="message-42">
          <div class="message">A new comment was added.</div>
        </div>
        <div class="meta">
          <a class="avatar-wrap smaller" href="__BASE_PATH__/admin">
            <img src="/assets/images/default-avatar-64.png">
          </a>
          <a href="__BASE_PATH__/admin" class="author">Site Admin</a>@admin
          <span class="ago pull-right" title="2026-06-30T12:00:00Z">just now</span>
        </div>
      </div>
    </div>
  </li>`,
);

const EXPECTED_SIDEBAR_FAVORITE_TAB = `
<div id="usermenu-tab-content-list" class="tab-content">
  <div class="search-result">
    <div class="group">
      <input class="search-input org-search" type="text" autocomplete="off" placeholder="Type name">
      <span class="bar"></span>
    </div>
    <ul class="tab-pane user-ul " id="organizations">
      <li class="org-li">
        <div class="org-list project-flex-container all-orgs">
          <div class="project-item project-item-container">
            <div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
            <div class="projectName-owner all-org-names flex-item">
              <div class="project-name org-name flex-item">admin</div>
              <div class="project-owner flex-item sub-project-counter"></div>
            </div>
          </div>
          <div class="star-org flex-item"></div>
        </div>
        <ul class="project-ul">
          <li class="user-li show-always" data-location="__BASE_PATH__/admin/sample">
            <div class="project-list project-flex-container" data-toggle="popover" data-trigger="hover" data-placement="right" data-content="Sample project">
              <div class="project-item project-item-container">
                <div class="flex-item site-logo all-project-names"><i class="project-avatar"><img class="logo" src="/assets/images/project_default_logo.png"></i></div>
                <div class="projectName-owner flex-item"><div class="project-name flex-item">sample </div></div>
              </div>
              <div class="star-project flex-item" data-project-id="7"><i class="star starred material-icons">star</i></div>
            </div>
          </li>
        </ul>
      </li>
      <li class="org-li favored">
        <div class="org-list project-flex-container all-orgs">
          <div class="project-item project-item-container">
            <div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
            <div class="projectName-owner all-org-names flex-item">
              <div class="project-name org-name flex-item">weblabs</div>
              <div class="project-owner flex-item">1</div>
            </div>
          </div>
          <div class="star-org flex-item" data-organization-id="11"><i class="star starred material-icons">star</i></div>
        </div>
        <ul class="project-ul">
          <li class="user-li hide" data-location="__BASE_PATH__/weblabs/playground">
            <div class="project-list project-flex-container" data-toggle="popover" data-trigger="hover" data-placement="right" data-content="Internal playground">
              <div class="project-item project-item-container">
                <div class="flex-item site-logo all-project-names"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                <div class="projectName-owner flex-item"><div class="project-name flex-item">playground <i class="yobicon-lock yobicon-small"></i></div></div>
              </div>
              <div class="star-project flex-item" data-project-id="8"><i class="star material-icons">star</i></div>
            </div>
          </li>
        </ul>
      </li>
      <ul class="etc-favorites"></ul>
      <li class="user-li" data-location="__BASE_PATH__/admin/member">
        <div class="project-list project-flex-container">
          <div class="project-item project-item-container">
            <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
            <div class="projectName-owner flex-item">
              <div class="project-name flex-item">member </div>
              <div class="project-owner flex-item"><a href="__BASE_PATH__/admin">admin</a></div>
            </div>
          </div>
          <div class="star-project flex-item" data-project-id="9"><i class="star material-icons">star</i></div>
        </div>
      </li>
    </ul>
  </div>
</div>
`;

const EXPECTED_SIDEBAR_PROJECT_TAB = `
<div id="usermenu-tab-content-list" class="tab-content">
  <div>
    <div class="search-result">
      <div class="tab-pane myproject-list-wrap">
        <div class="group">
          <input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="Type name">
          <span class="bar"></span>
        </div>
        <div class="subtab-wrap subtab-group">
          <ul class="nav-subtab unstyled">
            <li class="active"><a href="#recentlyVisited" data-toggle="tab">Recently visited</a></li>
            <li><a href="#createdByMe" data-toggle="tab">Create</a></li>
            <li><a href="#watching" data-toggle="tab">Watching</a></li>
            <li><a href="#joinmember" data-toggle="tab">Member</a></li>
          </ul>
        </div>
        <div class="tab-content">
          <ul class="tab-pane user-ul active" id="recentlyVisited">
            <li class="user-li" data-location="__BASE_PATH__/admin/sample">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <div class="flex-item site-logo"><i class="project-avatar"><img class="logo" src="/assets/images/project_default_logo.png"></i></div>
                  <div class="projectName-owner flex-item">
                    <div class="project-name flex-item">sample </div>
                    <div class="project-owner flex-item"><a href="__BASE_PATH__/admin">admin</a></div>
                  </div>
                </div>
                <div class="star-project flex-item" data-project-id="7"><i class="star material-icons">star</i></div>
              </div>
            </li>
          </ul>
          <ul class="tab-pane user-ul " id="watching">
            <li class="user-li" data-location="__BASE_PATH__/weblabs/playground">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                  <div class="projectName-owner flex-item">
                    <div class="project-name flex-item">playground <i class="yobicon-lock yobicon-small"></i></div>
                    <div class="project-owner flex-item"><a href="__BASE_PATH__/weblabs">weblabs</a></div>
                  </div>
                </div>
                <div class="star-project flex-item" data-project-id="8"><i class="star material-icons">star</i></div>
              </div>
            </li>
          </ul>
          <div id="createdByMe" class="no-result tab-pane user-ul ">No results</div>
          <ul class="tab-pane user-ul " id="joinmember">
            <li class="user-li" data-location="__BASE_PATH__/admin/member">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                  <div class="projectName-owner flex-item">
                    <div class="project-name flex-item">member </div>
                    <div class="project-owner flex-item"><a href="__BASE_PATH__/admin">admin</a></div>
                  </div>
                </div>
                <div class="star-project flex-item" data-project-id="9"><i class="star material-icons">star</i></div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const EXPECTED_SIDEBAR_RECENT_ISSUE_TAB = `
<div id="usermenu-tab-content-list" class="tab-content">
  <div>
    <div class="search-result">
      <div class="tab-pane myproject-list-wrap">
        <div class="group">
          <input class="search-input project-search" type="text" id="query" autocomplete="off" placeholder="Type name">
          <span class="bar"></span>
        </div>
        <div class="tab-content">
          <ul class="tab-pane user-ul active" id="recentlyVisitedIssues">
            <li class="user-li" data-location="__BASE_PATH__/admin/sample/issue/42">
              <div class="project-list project-flex-container" data-toggle="popover" data-trigger="hover" data-placement="right" data-content="42">
                <div class="project-item project-item-container">
                  <div class="issue-item projectName-owner flex-item">
                    <div class="issue-title-start">-</div><div class="issue-title flex-item">Crash on login</div>
                  </div>
                </div>
              </div>
            </li>
            <li class="user-li" data-location="__BASE_PATH__/weblabs/playground/issue/7">
              <div class="project-list project-flex-container" data-toggle="popover" data-trigger="hover" data-placement="right" data-content="7">
                <div class="project-item project-item-container">
                  <div class="issue-item projectName-owner flex-item">
                    <div class="issue-title-start">-</div><div class="issue-title flex-item">Review onboarding copy</div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS = {
  activityStreamsMarginTop: "0px",
  gnbInnerHeight: "40px",
  gnbInnerWidth: 1235,
  gnbOuterBackground: "rgb(27, 27, 27)",
  gnbOuterHeight: "40px",
  guideToggleButtonBorderBottomLeftRadius: "6px",
  guideToggleButtonBorderBottomRightRadius: "6px",
  guideToggleButtonPaddingLeft: "25px",
  logoBackground: "rgb(255, 87, 34)",
  logoLineHeight: "40px",
  logoPadding: "6px 10px",
  mainStreamMarginBottom: "15px",
  navLinkColor: "rgb(85, 85, 85)",
  navLinkFontWeight: "700",
  navLinkPaddingLeft: "30px",
  pageFooterLineHeight: "34px",
  pageFooterOuterPadding: "10px 0px",
  pageWrapOuterMarginTop: "10px",
  pageWrapOuterMinHeight: "450px",
  providerColor: "rgb(51, 51, 51)",
  providerFontSize: "9px",
  providerMarginLeft: "4px",
};

const EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS = {
  ...EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS,
  warningBackground: "rgb(139, 139, 139)",
  warningBorderRadius: "6px",
  warningColor: "rgb(255, 255, 255)",
  warningFontSize: "16px",
  warningPaddingTop: "15px",
};

test("authenticated index redirects to the configured non-root default landing", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [], { defaultLandingPath: "/me" });

  await page.goto(`${basePath}/`);
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/me`);
});

test("authenticated home empty notifications matches legacy index notifications screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator(".warning-none")).toContainText("No notification");
  await expect(
    page.locator(
      ".myOrganizationList, .myProjectList, .myRecentIssueList, #usermenu-tab-content-list",
    ),
  ).toHaveCount(4);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_AUTHENTICATED_HOME.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );
  await expect(page.locator(".site-guide-outer")).not.toHaveClass(/hide/);
  await page.locator("#toggleIntro").click();
  await expect(page.locator(".site-guide-outer")).toHaveClass(/hide/);
  expect(await readLocalStorageValue(page, "yobi-intro")).toBe("false");
  await page.reload();
  await expect(page.locator(".site-guide-outer")).toHaveClass(/hide/);
  await page.locator("#toggleIntro").click();
  await expect(page.locator(".site-guide-outer")).not.toHaveClass(/hide/);
  expect(await readLocalStorageValue(page, "yobi-intro")).toBe("true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileAuthenticatedHomeMetrics(page)).toEqual({
    defaultLandingButtonDisplay: null,
    mainStreamWidth: 390,
    pageWrapOuterWidth: 390,
    siteGuideOuterMargin: "40px 0px 0px",
  });
});

test("authenticated shell renders legacy custom navbar link before my issues", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    (
      window as Window & {
        __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
      }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: "/yona",
      navbarCustomLinkName: "Docs",
      navbarCustomLinkUrl: "https://docs.example.test/yona",
    };
  });
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);

  const menuItems = page.locator(".gnb-usermenu > li.gnb-usermenu-item");
  await expect(menuItems.nth(0).locator("a.user-item-btn.loggged-in")).toHaveText("Docs");
  await expect(menuItems.nth(0).locator("a.user-item-btn.loggged-in")).toHaveAttribute(
    "href",
    "https://docs.example.test/yona",
  );
  await expect(menuItems.nth(1).locator("a.user-item-btn.loggged-in")).toHaveText("My Issues");
  await expect(menuItems.nth(1)).toHaveAttribute("title", "Shortcut (A)");
});

test("authenticated root sidebar favorite tab matches legacy index/myOrganizationList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  await page.locator("#sidebar-open-btn a").click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await expect(page.locator("#usermenu-tab-content-list #organizations")).toBeVisible();
  await expect(page.locator("#usermenu-tab-content-list .org-li")).toHaveCount(2);

  expect(await canonicalizeSelector(page, "#usermenu-tab-content-list")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_FAVORITE_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarFavoriteTabMetrics(page)).toEqual({
    logoWidth: 350,
    organizationCount: 2,
    organizationRowDisplay: "block",
    organizationRowHeight: 40,
    projectCount: 3,
    projectRowDisplay: "block",
    projectRowHeight: 49,
    rootWidth: 350,
    searchHeight: 30,
    searchPadding: "4px 6px",
    starWidth: 350,
  });
});

test("authenticated root keeps retired legacy index/sidebar framed shell absent", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  await expect(page.locator("body#html-body")).not.toHaveClass(/framed-body/);
  await expect(page.locator("#sidebar, #sidebar-bottom, #mainFrame, #mainFrameId")).toHaveCount(0);
  await expect(page.locator('iframe[name="mainFrame"]')).toHaveCount(0);
  await expect(page.locator('[target="mainFrame"]')).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(1);
  await expect(page.locator("#sidebar-open-btn a")).toHaveAttribute("href", "javascript:void(0);");
  expect(await readDesktopClosedSidebarMetrics(page)).toEqual({
    closedWidth: 0,
    profileRowTextAlign: "right",
  });
  await page.locator("#sidebar-open-btn a").click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  expect(await readDesktopOpenSidebarMetrics(page)).toEqual({
    openRight: 0,
    openTop: 40,
    openWidth: 362,
    tabContentTop: 167,
    tabRowTop: 92,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  expect(await readMobileOpenSidebarMetrics(page)).toEqual({
    openRight: 0,
    openTop: 40,
    openWidth: 392,
  });
});

test("authenticated root sidebar project tab matches legacy index/myProjectList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  await page.locator("#sidebar-open-btn a").click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await page.locator(".myProjectList a").click();
  await expect(page.locator("#usermenu-tab-content-list .project-search")).toBeVisible();
  await expect(page.locator("#usermenu-tab-content-list .user-li")).toHaveCount(3);

  expect(await canonicalizeSelector(page, "#usermenu-tab-content-list")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_PROJECT_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarProjectTabMetrics(page)).toEqual({
    activePaneDisplay: "block",
    logoWidth: 350,
    ownerFontSize: "13px",
    projectCount: 3,
    projectRowDisplay: "block",
    projectRowHeight: 69,
    rootWidth: 350,
    searchHeight: 30,
    searchPadding: "4px 6px",
    subtabDisplay: "block",
    subtabMarginTop: "0px",
  });
});

test("authenticated root sidebar recent issue tab matches legacy index/myRecentIssueList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  await page.locator("#sidebar-open-btn a").click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await page.locator(".myRecentIssueList a").click();
  await expect(page.locator("#usermenu-tab-content-list #recentlyVisitedIssues")).toBeVisible();
  await expect(page.locator("#usermenu-tab-content-list .user-li")).toHaveCount(2);

  expect(await canonicalizeSelector(page, "#usermenu-tab-content-list")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_RECENT_ISSUE_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarRecentIssueTabMetrics(page)).toEqual({
    activePaneDisplay: "block",
    issueCount: 2,
    issueRowDisplay: "block",
    issueRowHeight: 40,
    issueTitleColor: "rgb(0, 0, 0)",
    issueTitleDisplay: "block",
    issueTitleStartWidth: 350,
    rootWidth: 350,
    searchHeight: 30,
    searchPadding: "4px 6px",
  });
});

test("direct notifications route matches legacy Application.notifications empty state DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".activity-streams.notification-wrap")).toBeVisible();
  await expect(page.locator(".warning-none")).toContainText("No notification");
  await expect(
    page.locator(
      ".myOrganizationList, .myProjectList, .myRecentIssueList, #usermenu-tab-content-list",
    ),
  ).toHaveCount(4);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DIRECT_NOTIFICATIONS.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileAuthenticatedHomeMetrics(page)).toEqual({
    defaultLandingButtonDisplay: "none",
    mainStreamWidth: 390,
    pageWrapOuterWidth: 390,
    siteGuideOuterMargin: "40px 0px 0px",
  });
});

test("direct notifications route matches legacy populated notification row DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-64.png",
        displayName: "Site Admin",
        loginId: "admin",
      },
      createdAt: "2026-06-30T12:00:00Z",
      createdLabel: "just now",
      eventType: "NEW_COMMENT",
      id: "42",
      message: "A new comment was added.",
      targetHref: "/admin/sample/issue/1",
      targetTitle: "Issue #1 updated",
      typeIcon: "comment2",
    },
  ]);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".notification-stream")).toHaveCount(1);
  await expect(page.locator(".warning-none")).toHaveCount(0);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_DIRECT_NOTIFICATIONS_WITH_NOTIFICATION.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedNotificationShellMetrics(page)).toEqual(
    EXPECTED_AUTHENTICATED_NOTIFICATION_SHELL_METRICS,
  );
  expect(await readDesktopNotificationStreamMetrics(page)).toEqual({
    agoMarginLeft: "0px",
    avatarMarginTop: "3px",
    messageColor: "rgb(136, 136, 136)",
    messageFontSize: "13px",
    messageLineHeight: "20px",
    messageMarginTop: "3px",
    metaColor: "rgb(187, 187, 187)",
    metaFontSize: "12px",
    metaMarginTop: "5px",
    streamBorderBottomWidth: "1px",
    streamColor: "rgb(221, 221, 221)",
    streamDescDisplay: "inline-block",
    streamDescPaddingLeft: "7px",
    streamDescWidth: "720.953px",
    streamPaddingLeft: "25px",
    streamPaddingTop: "5px",
    streamTypeColor: "rgb(139, 0, 139)",
    streamTypeDisplay: "inline-block",
    streamTypeFontSize: "20px",
    streamTypeLineHeight: "20px",
    streamTypeMarginTop: "2px",
    streamTypePaddingLeft: "6px",
    titleColor: "rgb(81, 170, 204)",
    titleFontSize: "14px",
    titleFontWeight: "700",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileNotificationStreamMetrics(page)).toEqual({
    avatarDisplay: "inline-block",
    messageLineHeight: "20px",
    messageWhiteSpace: "normal",
    metaFontSize: "12px",
    streamDescDisplay: "inline-block",
    streamDescWidth: 338,
    streamPaddingLeft: "25px",
    streamTypeDisplay: "inline-block",
    streamTypeFontSize: "20px",
    titleFontSize: "14px",
  });
});

test("direct notifications route preserves legacy notification row expand targets", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-64.png",
        displayName: "Site Admin",
        loginId: "admin",
      },
      createdAt: "2026-06-30T12:00:00Z",
      createdLabel: "just now",
      eventType: "NEW_COMMENT",
      id: "42",
      message: "A new comment was added.",
      targetHref: "/admin/sample/issue/1",
      targetTitle: "Issue #1 updated",
      typeIcon: "comment2",
    },
  ]);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".notification-stream")).toHaveCount(1);
  const beforeUrl = page.url();
  const messageWrap = page.locator("#message-42");

  await expect(messageWrap).toHaveClass(/nowrap/);
  await page.locator(".notification-stream .title a").evaluate((anchor) => {
    anchor.addEventListener("click", (event) => event.preventDefault(), { once: true });
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await expect(messageWrap).toHaveClass(/nowrap/);
  await page.locator(".notification-stream .avatar-wrap img").evaluate((image) => {
    image.closest("a")?.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    image.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await expect(messageWrap).toHaveClass(/nowrap/);

  await page.locator(".notification-stream .message").click();
  await expect(messageWrap).not.toHaveClass(/nowrap/);
  await expect
    .poll(() => messageWrap.evaluate((element) => element.style.minHeight))
    .toMatch(/px$/u);
  await page.locator(".notification-stream .message").click();
  await expect(messageWrap).toHaveClass(/nowrap/);
  await expect.poll(() => messageWrap.evaluate((element) => element.style.minHeight)).toBe("");
  expect(page.url()).toBe(beforeUrl);
});

test("direct notifications route shows legacy overflowing row more marker", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-64.png",
        displayName: "Site Admin",
        loginId: "admin",
      },
      createdAt: "2026-06-30T12:00:00Z",
      createdLabel: "just now",
      eventType: "NEW_COMMENT",
      id: "42",
      message: Array.from({ length: 80 }, () => "Overflow notification body").join(" "),
      targetHref: "/admin/sample/issue/1",
      targetTitle: "Issue #1 updated",
      typeIcon: "comment2",
    },
  ]);

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".notification-stream")).toHaveCount(1);
  const more = page.locator(".notification-stream .more");
  const messageWrap = page.locator("#message-42");

  await expect(more).toHaveText("...");
  await expect(more).toBeVisible();
  await page.locator(".notification-stream .message").click();
  await expect(messageWrap).not.toHaveClass(/nowrap/);
  await expect(more).toBeHidden();
  await page.locator(".notification-stream .message").click();
  await expect(messageWrap).toHaveClass(/nowrap/);
  await expect(more).toBeVisible();
});

test("direct notifications route appends legacy notification-more rows", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const firstPageItems = Array.from({ length: 20 }, (_, index) =>
    createMockNotification(String(index + 1), `Issue #${index + 1} updated`),
  );
  const nextPageItem = createMockNotification("21", "Issue #21 updated");
  const requests: string[] = [];
  await mockAuthenticatedNotificationsByPage(page, (url) => {
    requests.push(`${url.pathname}${url.search}`);
    return url.searchParams.get("from") === "20"
      ? { hasMore: false, items: [nextPageItem], total: 21 }
      : { hasMore: true, items: firstPageItems, total: 21 };
  });

  await page.goto(`${basePath}/notifications`);
  await expect(page.locator(".notification-stream")).toHaveCount(20);
  await expect(page.locator("#notification-more")).toBeVisible();
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_DIRECT_NOTIFICATIONS.replace(
        `<div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>`,
        `${expectedNotificationRows(firstPageItems, basePath)}<li><a href="javascript:void(0);" id="notification-more" class="ybtn">More</a></li>`,
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const beforeUrl = page.url();
  await page.locator("#notification-more").click();
  await expect(page.locator(".notification-stream")).toHaveCount(21);
  await expect(page.locator("#notification-more")).toHaveCount(0);
  expect(page.url()).toBe(beforeUrl);
  expect(requests).toContain(`${basePath}/api/v1/notifications?from=20&size=20`);
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_DIRECT_NOTIFICATIONS.replace(
        `<div class="warning-none"><i class="yobicon-danger"></i>No notification has been received.</div>`,
        expectedNotificationRows([...firstPageItems, nextPageItem], basePath),
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

function createMockNotification(id: string, targetTitle: string) {
  return {
    actor: {
      avatarUrl: "/assets/images/default-avatar-64.png",
      displayName: "Site Admin",
      loginId: "admin",
    },
    createdAt: "2026-06-30T12:00:00Z",
    createdLabel: "just now",
    eventType: "NEW_COMMENT",
    id,
    message: "A new comment was added.",
    targetHref: "/admin/sample/issue/1",
    targetTitle,
    typeIcon: "comment2",
  };
}

function expectedNotificationRows(
  items: ReturnType<typeof createMockNotification>[],
  basePath: string,
) {
  return items
    .map(
      (item) => `<li class="notification-stream">
    <div class="stream-type comment2"><i class="yobicon-comment2"></i></div>
    <div class="stream-desc" data-target="message-${item.id}" data-toggle="learnmore">
      <div class="stream-info">
        <div class="title"><a href="${basePath}/admin/sample/issue/1">${item.targetTitle}</a></div>
        <div class="message-wrap nowrap" id="message-${item.id}">
          <div class="message">A new comment was added.</div>
        </div>
        <div class="meta">
          <a class="avatar-wrap smaller" href="${basePath}/admin">
            <img src="/assets/images/default-avatar-64.png">
          </a>
          <a href="${basePath}/admin" class="author">Site Admin</a>@admin
          <span class="ago pull-right" title="2026-06-30T12:00:00Z">just now</span>
        </div>
      </div>
    </div>
  </li>`,
    )
    .join("");
}

async function readLocalStorageValue(page: Page, key: string) {
  return page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
}

async function readDesktopAuthenticatedNotificationShellMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const activityStreams = document.querySelector<HTMLElement>(".activity-streams");
    const guideToggleButton = document.querySelector<HTMLElement>(".guide-toggle button");
    const navLink = document.querySelector<HTMLElement>(".nav-tabs > li > a");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !mainStream ||
      !activityStreams ||
      !guideToggleButton ||
      !navLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected authenticated notification shell metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const mainStreamStyle = getComputedStyle(mainStream);
    const activityStreamsStyle = getComputedStyle(activityStreams);
    const guideToggleButtonStyle = getComputedStyle(guideToggleButton);
    const navLinkStyle = getComputedStyle(navLink);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      activityStreamsMarginTop: activityStreamsStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      guideToggleButtonBorderBottomLeftRadius: guideToggleButtonStyle.borderBottomLeftRadius,
      guideToggleButtonBorderBottomRightRadius: guideToggleButtonStyle.borderBottomRightRadius,
      guideToggleButtonPaddingLeft: guideToggleButtonStyle.paddingLeft,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      mainStreamMarginBottom: mainStreamStyle.marginBottom,
      navLinkColor: navLinkStyle.color,
      navLinkFontWeight: navLinkStyle.fontWeight,
      navLinkPaddingLeft: navLinkStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
    };
  });
}

async function readMobileAuthenticatedHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const siteGuideOuter = document.querySelector<HTMLElement>(".site-guide-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const defaultLandingButton = document.querySelector<HTMLElement>("#setDefaultLoginPage");
    if (!pageWrapOuter || !siteGuideOuter || !mainStream) {
      throw new Error("Expected mobile authenticated home metric targets are missing.");
    }

    return {
      defaultLandingButtonDisplay: defaultLandingButton
        ? getComputedStyle(defaultLandingButton).display
        : null,
      mainStreamWidth: Math.round(mainStream.getBoundingClientRect().width),
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      siteGuideOuterMargin: getComputedStyle(siteGuideOuter).margin,
    };
  });
}

async function readDesktopClosedSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const sideNav = document.querySelector<HTMLElement>("#mySidenav");
    const userMenuWrap = document.querySelector<HTMLElement>("#mySidenav .user-menu-wrap");
    if (!sideNav || !userMenuWrap) {
      throw new Error("Expected closed SPA sidebar metric targets are missing.");
    }

    return {
      closedWidth: Math.round(sideNav.getBoundingClientRect().width),
      profileRowTextAlign: getComputedStyle(userMenuWrap).textAlign,
    };
  });
}

async function readDesktopOpenSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const sideNav = document.querySelector<HTMLElement>("#mySidenav");
    const tabRow = document.querySelector<HTMLElement>("#mySidenav .nav.nav-tabs.nm");
    const tabContent = document.querySelector<HTMLElement>("#mySidenav .tab-content.tab-box");
    if (!sideNav || !tabRow || !tabContent) {
      throw new Error("Expected open SPA sidebar metric targets are missing.");
    }

    const openBox = sideNav.getBoundingClientRect();
    return {
      openRight: Math.round(window.innerWidth - openBox.right),
      openTop: Math.round(openBox.top),
      openWidth: Math.round(openBox.width),
      tabContentTop: Math.round(tabContent.getBoundingClientRect().top),
      tabRowTop: Math.round(tabRow.getBoundingClientRect().top),
    };
  });
}

async function readMobileOpenSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const sideNav = document.querySelector<HTMLElement>("#mySidenav");
    if (!sideNav) {
      throw new Error("Expected mobile SPA sidebar metric target is missing.");
    }

    const openBox = sideNav.getBoundingClientRect();
    return {
      openRight: Math.round(window.innerWidth - openBox.right),
      openTop: Math.round(openBox.top),
      openWidth: Math.round(openBox.width),
    };
  });
}

async function readSidebarFavoriteTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#usermenu-tab-content-list");
    const search = document.querySelector<HTMLElement>("#usermenu-tab-content-list .org-search");
    const organization = document.querySelector<HTMLElement>("#usermenu-tab-content-list .org-li");
    const organizationRow = document.querySelector<HTMLElement>(
      "#usermenu-tab-content-list .org-list",
    );
    const project = document.querySelector<HTMLElement>(
      "#usermenu-tab-content-list .user-li[data-location$='/admin/sample']",
    );
    const projectRow = project?.querySelector<HTMLElement>(".project-list");
    const logo = project?.querySelector<HTMLElement>(".site-logo");
    const star = project?.querySelector<HTMLElement>(".star-project");
    const missing = Object.entries({
      logo,
      organization,
      organizationRow,
      project,
      projectRow,
      root,
      search,
      star,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected favorite sidebar metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const organizationRowStyle = getComputedStyle(organizationRow);
    const projectRowStyle = getComputedStyle(projectRow);
    const searchStyle = getComputedStyle(search);
    return {
      logoWidth: Math.round(logo.getBoundingClientRect().width),
      organizationCount: root.querySelectorAll(".org-li").length,
      organizationRowDisplay: organizationRowStyle.display,
      organizationRowHeight: Math.round(organizationRow.getBoundingClientRect().height),
      projectCount: root.querySelectorAll(".user-li").length,
      projectRowDisplay: projectRowStyle.display,
      projectRowHeight: Math.round(projectRow.getBoundingClientRect().height),
      rootWidth: Math.round(root.getBoundingClientRect().width),
      searchHeight: Math.round(search.getBoundingClientRect().height),
      searchPadding: searchStyle.padding,
      starWidth: Math.round(star.getBoundingClientRect().width),
    };
  });
}

async function readSidebarProjectTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#usermenu-tab-content-list");
    const search = document.querySelector<HTMLElement>(
      "#usermenu-tab-content-list .project-search",
    );
    const subtab = document.querySelector<HTMLElement>("#usermenu-tab-content-list .subtab-wrap");
    const activePane = document.querySelector<HTMLElement>("#recentlyVisited");
    const project = document.querySelector<HTMLElement>("#recentlyVisited .user-li");
    const projectRow = project?.querySelector<HTMLElement>(".project-list");
    const logo = project?.querySelector<HTMLElement>(".site-logo");
    const owner = project?.querySelector<HTMLElement>(".project-owner");
    const missing = Object.entries({
      activePane,
      logo,
      owner,
      project,
      projectRow,
      root,
      search,
      subtab,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected project sidebar metric targets are missing: ${missing.join(", ")}`);
    }

    const projectRowStyle = getComputedStyle(projectRow);
    const searchStyle = getComputedStyle(search);
    const subtabStyle = getComputedStyle(subtab);
    return {
      activePaneDisplay: getComputedStyle(activePane).display,
      logoWidth: Math.round(logo.getBoundingClientRect().width),
      ownerFontSize: getComputedStyle(owner).fontSize,
      projectCount: root.querySelectorAll(".user-li").length,
      projectRowDisplay: projectRowStyle.display,
      projectRowHeight: Math.round(projectRow.getBoundingClientRect().height),
      rootWidth: Math.round(root.getBoundingClientRect().width),
      searchHeight: Math.round(search.getBoundingClientRect().height),
      searchPadding: searchStyle.padding,
      subtabDisplay: subtabStyle.display,
      subtabMarginTop: subtabStyle.marginTop,
    };
  });
}

async function readSidebarRecentIssueTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#usermenu-tab-content-list");
    const search = document.querySelector<HTMLElement>(
      "#usermenu-tab-content-list .project-search",
    );
    const activePane = document.querySelector<HTMLElement>("#recentlyVisitedIssues");
    const issue = document.querySelector<HTMLElement>("#recentlyVisitedIssues .user-li");
    const issueRow = issue?.querySelector<HTMLElement>(".project-list");
    const issueTitle = issue?.querySelector<HTMLElement>(".issue-title");
    const issueTitleStart = issue?.querySelector<HTMLElement>(".issue-title-start");
    const missing = Object.entries({
      activePane,
      issue,
      issueRow,
      issueTitle,
      issueTitleStart,
      root,
      search,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected recent issue sidebar metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const issueRowStyle = getComputedStyle(issueRow);
    const issueTitleStyle = getComputedStyle(issueTitle);
    const searchStyle = getComputedStyle(search);
    return {
      activePaneDisplay: getComputedStyle(activePane).display,
      issueCount: root.querySelectorAll(".user-li").length,
      issueRowDisplay: issueRowStyle.display,
      issueRowHeight: Math.round(issueRow.getBoundingClientRect().height),
      issueTitleColor: issueTitleStyle.color,
      issueTitleDisplay: issueTitleStyle.display,
      issueTitleStartWidth: Math.round(issueTitleStart.getBoundingClientRect().width),
      rootWidth: Math.round(root.getBoundingClientRect().width),
      searchHeight: Math.round(search.getBoundingClientRect().height),
      searchPadding: searchStyle.padding,
    };
  });
}

async function readDesktopAuthenticatedHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const mainStream = document.querySelector<HTMLElement>(".main-stream");
    const activityStreams = document.querySelector<HTMLElement>(".activity-streams");
    const warning = document.querySelector<HTMLElement>(".warning-none");
    const guideToggleButton = document.querySelector<HTMLElement>(".guide-toggle button");
    const navLink = document.querySelector<HTMLElement>(".nav-tabs > li > a");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !mainStream ||
      !activityStreams ||
      !warning ||
      !guideToggleButton ||
      !navLink ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected authenticated home metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const mainStreamStyle = getComputedStyle(mainStream);
    const activityStreamsStyle = getComputedStyle(activityStreams);
    const warningStyle = getComputedStyle(warning);
    const guideToggleButtonStyle = getComputedStyle(guideToggleButton);
    const navLinkStyle = getComputedStyle(navLink);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      activityStreamsMarginTop: activityStreamsStyle.marginTop,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      guideToggleButtonBorderBottomLeftRadius: guideToggleButtonStyle.borderBottomLeftRadius,
      guideToggleButtonBorderBottomRightRadius: guideToggleButtonStyle.borderBottomRightRadius,
      guideToggleButtonPaddingLeft: guideToggleButtonStyle.paddingLeft,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      mainStreamMarginBottom: mainStreamStyle.marginBottom,
      navLinkColor: navLinkStyle.color,
      navLinkFontWeight: navLinkStyle.fontWeight,
      navLinkPaddingLeft: navLinkStyle.paddingLeft,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      warningBackground: warningStyle.backgroundColor,
      warningBorderRadius: warningStyle.borderTopLeftRadius,
      warningColor: warningStyle.color,
      warningFontSize: warningStyle.fontSize,
      warningPaddingTop: warningStyle.paddingTop,
    };
  });
}

async function readDesktopNotificationStreamMetrics(page: Page) {
  return page.evaluate(() => {
    const stream = document.querySelector<HTMLElement>(".notification-stream");
    const streamType = document.querySelector<HTMLElement>(".notification-stream .stream-type");
    const streamDesc = document.querySelector<HTMLElement>(".notification-stream .stream-desc");
    const title = document.querySelector<HTMLElement>(".notification-stream .title");
    const messageWrap = document.querySelector<HTMLElement>(".notification-stream .message-wrap");
    const meta = document.querySelector<HTMLElement>(".notification-stream .meta");
    const avatar = document.querySelector<HTMLElement>(".notification-stream .avatar-wrap");
    const ago = document.querySelector<HTMLElement>(".notification-stream .ago");
    if (
      !stream ||
      !streamType ||
      !streamDesc ||
      !title ||
      !messageWrap ||
      !meta ||
      !avatar ||
      !ago
    ) {
      throw new Error("Expected notification stream metric targets are missing.");
    }

    const streamStyle = getComputedStyle(stream);
    const streamTypeStyle = getComputedStyle(streamType);
    const streamDescStyle = getComputedStyle(streamDesc);
    const titleStyle = getComputedStyle(title);
    const messageWrapStyle = getComputedStyle(messageWrap);
    const metaStyle = getComputedStyle(meta);
    const avatarStyle = getComputedStyle(avatar);
    const agoStyle = getComputedStyle(ago);

    return {
      agoMarginLeft: agoStyle.marginLeft,
      avatarMarginTop: avatarStyle.marginTop,
      messageColor: messageWrapStyle.color,
      messageFontSize: messageWrapStyle.fontSize,
      messageLineHeight: messageWrapStyle.lineHeight,
      messageMarginTop: messageWrapStyle.marginTop,
      metaColor: metaStyle.color,
      metaFontSize: metaStyle.fontSize,
      metaMarginTop: metaStyle.marginTop,
      streamBorderBottomWidth: streamStyle.borderBottomWidth,
      streamColor: streamStyle.color,
      streamDescDisplay: streamDescStyle.display,
      streamDescPaddingLeft: streamDescStyle.paddingLeft,
      streamDescWidth: streamDescStyle.width,
      streamPaddingLeft: streamStyle.paddingLeft,
      streamPaddingTop: streamStyle.paddingTop,
      streamTypeColor: streamTypeStyle.color,
      streamTypeDisplay: streamTypeStyle.display,
      streamTypeFontSize: streamTypeStyle.fontSize,
      streamTypeLineHeight: streamTypeStyle.lineHeight,
      streamTypeMarginTop: streamTypeStyle.marginTop,
      streamTypePaddingLeft: streamTypeStyle.paddingLeft,
      titleColor: titleStyle.color,
      titleFontSize: titleStyle.fontSize,
      titleFontWeight: titleStyle.fontWeight,
    };
  });
}

async function readMobileNotificationStreamMetrics(page: Page) {
  return page.evaluate(() => {
    const stream = document.querySelector<HTMLElement>(".notification-stream");
    const streamType = document.querySelector<HTMLElement>(".notification-stream .stream-type");
    const streamDesc = document.querySelector<HTMLElement>(".notification-stream .stream-desc");
    const title = document.querySelector<HTMLElement>(".notification-stream .title");
    const messageWrap = document.querySelector<HTMLElement>(".notification-stream .message-wrap");
    const meta = document.querySelector<HTMLElement>(".notification-stream .meta");
    const avatar = document.querySelector<HTMLElement>(".notification-stream .avatar-wrap");
    if (!stream || !streamType || !streamDesc || !title || !messageWrap || !meta || !avatar) {
      throw new Error("Expected mobile notification stream metric targets are missing.");
    }

    const streamStyle = getComputedStyle(stream);
    const streamTypeStyle = getComputedStyle(streamType);
    const streamDescStyle = getComputedStyle(streamDesc);
    const titleStyle = getComputedStyle(title);
    const messageWrapStyle = getComputedStyle(messageWrap);
    const metaStyle = getComputedStyle(meta);
    const avatarStyle = getComputedStyle(avatar);

    return {
      avatarDisplay: avatarStyle.display,
      messageLineHeight: messageWrapStyle.lineHeight,
      messageWhiteSpace: messageWrapStyle.whiteSpace,
      metaFontSize: metaStyle.fontSize,
      streamDescDisplay: streamDescStyle.display,
      streamDescWidth: Math.round(streamDesc.getBoundingClientRect().width),
      streamPaddingLeft: streamStyle.paddingLeft,
      streamTypeDisplay: streamTypeStyle.display,
      streamTypeFontSize: streamTypeStyle.fontSize,
      titleFontSize: titleStyle.fontSize,
    };
  });
}

async function mockAuthenticatedEmptyNotifications(page: Page) {
  await mockAuthenticatedNotifications(page, []);
}

async function mockWorkspaceSidebarProjects(page: Page) {
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [
          {
            id: 11,
            name: "weblabs",
            projectCount: 1,
            projects: [
              {
                favored: false,
                id: 8,
                isPrivate: true,
                logoUrl: "",
                overview: "Internal playground",
                ownerName: "weblabs",
                projectName: "playground",
              },
            ],
          },
        ],
        favoriteProjects: [
          {
            id: 9,
            isPrivate: false,
            logoUrl: "",
            ownerName: "admin",
            projectName: "member",
          },
        ],
        issueItems: [
          {
            issueNumber: 42,
            ownerName: "admin",
            projectName: "sample",
            title: "Crash on login",
          },
          {
            issueNumber: 7,
            ownerName: "weblabs",
            projectName: "playground",
            title: "Review onboarding copy",
          },
        ],
        memberProjects: [
          {
            id: 9,
            isPrivate: false,
            logoUrl: "",
            ownerName: "admin",
            projectName: "member",
          },
        ],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          connectedSocialProviders: [],
          displayName: "Site Admin",
          englishName: "",
          isBlocked: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "",
        },
        pullRequestItems: [],
        ownProjects: [
          {
            favored: true,
            id: 7,
            isPrivate: false,
            logoUrl: "/assets/images/project_default_logo.png",
            overview: "Sample project",
            ownerName: "admin",
            projectName: "sample",
          },
        ],
        recentProjects: [
          {
            id: 7,
            isPrivate: false,
            logoUrl: "/assets/images/project_default_logo.png",
            ownerName: "admin",
            projectName: "sample",
          },
        ],
        watchedProjects: [
          {
            id: 8,
            isPrivate: true,
            logoUrl: "",
            ownerName: "weblabs",
            projectName: "playground",
          },
        ],
      }),
    });
  });
}

async function mockAuthenticatedNotifications(
  page: Page,
  items: unknown[],
  sessionOverrides: Record<string, unknown> = {},
) {
  await mockAuthenticatedNotificationsByPage(
    page,
    () => ({
      hasMore: false,
      items,
      total: items.length,
    }),
    sessionOverrides,
  );
}

async function mockAuthenticatedNotificationsByPage(
  page: Page,
  resolveResponse: (url: URL) => { hasMore: boolean; items: unknown[]; total: number },
  sessionOverrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
        ...sessionOverrides,
      }),
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(resolveResponse(url)),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .admin-logged-in-affix, .gnb-outer, .page-wrap-outer, .page-footer-outer",
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
        "autocomplete",
        "accesskey",
        "placeholder",
        "href",
        "src",
        "target",
        "title",
        "data-location",
        "data-organization-id",
        "data-project-id",
        "data-toggle",
        "data-placement",
        "data-trigger",
        "data-content",
        "data-target",
        "data-url",
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

async function canonicalizeSelector(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    if (!root) {
      throw new Error(`Missing selector: ${targetSelector}`);
    }
    return visit(root);

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "autocomplete",
        "accesskey",
        "placeholder",
        "href",
        "src",
        "target",
        "title",
        "data-location",
        "data-organization-id",
        "data-project-id",
        "data-toggle",
        "data-placement",
        "data-trigger",
        "data-content",
        "data-target",
        "data-url",
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
  }, selector);
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
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
          "autocomplete",
          "accesskey",
          "placeholder",
          "href",
          "src",
          "target",
          "title",
          "data-location",
          "data-organization-id",
          "data-project-id",
          "data-toggle",
          "data-placement",
          "data-trigger",
          "data-content",
          "data-target",
          "data-url",
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
    },
    { markup: html },
  );
}
