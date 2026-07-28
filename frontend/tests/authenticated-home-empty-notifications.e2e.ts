import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const NOTIFICATION_ROW = '[data-stylex-owner="authenticated-home-notification-row"]';
const NOTIFICATION_DESC = '[data-stylex-owner="authenticated-home-notification-desc"]';
const NOTIFICATION_TITLE = '[data-stylex-owner="authenticated-home-notification-title"]';
const NOTIFICATION_MESSAGE = '[data-stylex-owner="authenticated-home-notification-message"]';
const NOTIFICATION_MORE = '[data-stylex-owner="authenticated-home-notification-more"]';
const NOTIFICATION_META = '[data-stylex-owner="authenticated-home-notification-meta"]';
const NOTIFICATION_AUTHOR = '[data-stylex-owner="authenticated-home-notification-author"]';

const EXPECTED_AUTHENTICATED_HOME = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<div class="admin-logged-in-affix">You are Admin now! <span class="small-font">With great power comes great responsibility</span></div>
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
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" title="Site administration">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <button type="button" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="__BASE_PATH__/legacy-assets/images/default-avatar-34.png"></span><span class="caret"></span>
        </button>
      </li>
      <li class="gnb-usermenu-dropdown">
        <button type="button">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </button>
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
        <span>Tada! Welcome to Yoram! - Web-based platform for collaborative software development</span>
      </h3>
      <table class="welcome-table table borderless">
        <tbody>
          <tr>
            <td><a href="__BASE_PATH__/projectform" class="ybtn ybtn-success">Create new project</a></td>
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
      <button id="toggleIntro" type="button"><i class="yobicon-resizev"></i></button>
    </div>
    <div class="page on-fold-intro">
      <div class="row-fluid content-container">
        <div class="span8 main-stream">
          <ul class="nav nav-tabs">
            <li class="active"><a href="__BASE_PATH__/notifications">Notification</a></li>
            <li><a href="__BASE_PATH__/user/issues">My Issues</a></li>
            <li><a href="__BASE_PATH__/user/files">My Files</a></li>
            <li></li>
          </ul>
          <ul class="activity-streams notification-wrap unstyled">
            <div class="warning-none"><i class="yobicon-danger"></i> No notification has been received.</div>
          </ul>
        </div>
        <div class="span4 index-menu right-menu span-hard-wrap"></div>
      </div>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Yoram authors</span>
  </div>
</footer>
`;

const EXPECTED_DIRECT_NOTIFICATIONS = EXPECTED_AUTHENTICATED_HOME.replace(
  `<li></li>
          </ul>`,
  `<li><button id="setDefaultLoginPage" type="button" title="Set to default page">Set to default page</button></li>
          </ul>`,
);

const EXPECTED_DIRECT_NOTIFICATIONS_WITH_NOTIFICATION = EXPECTED_DIRECT_NOTIFICATIONS.replace(
  `<div class="warning-none"><i class="yobicon-danger"></i> No notification has been received.</div>`,
  `<li class="notification-stream">
    <div class="stream-type comment2"><i class="yobicon-comment2"></i></div>
    <div class="stream-desc">
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
<div class="tab-pane user-project-list active" id="myOrganizationList">
  <div class="search-result">
    <div class="group">
      <input class="search-input org-search" type="text" value="" autocomplete="off" placeholder="Type name">
      <span class="bar"></span>
    </div>
    <ul class="tab-pane user-ul " id="organizations">
      <li class="org-li">
        <div class="org-list project-flex-container all-orgs">
          <button class="project-item project-item-container organization-toggle" type="button">
            <div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
            <div class="projectName-owner all-org-names flex-item">
              <div class="project-name org-name flex-item">admin</div>
              <div class="project-owner flex-item sub-project-counter">1</div>
            </div>
          </button>
          <div class="star-org flex-item"></div>
        </div>
        <ul class="project-ul">
          <li class="user-li show-always">
            <div class="project-list project-flex-container">
              <a href="__BASE_PATH__/admin/sample" class="project-item project-item-container sidebar-project-link sidebar-row-link">
                <div class="flex-item site-logo all-project-names"><i class="project-avatar"><img class="logo" src="__BASE_PATH__/legacy-assets/images/project_default_logo.png"></i></div>
                <div class="projectName-owner flex-item"><div class="project-name flex-item">sample </div></div>
              </a>
              <button class="star-project flex-item" type="button"><i class="star starred material-icons">star</i></button>
            </div>
          </li>
        </ul>
      </li>
      <li class="org-li favored">
        <div class="org-list project-flex-container all-orgs">
          <button class="project-item project-item-container organization-toggle" type="button">
            <div class="flex-item site-logo"><i class="yobicon-angle-right"></i></div>
            <div class="projectName-owner all-org-names flex-item">
              <div class="project-name org-name flex-item">weblabs</div>
              <div class="project-owner flex-item">1</div>
            </div>
          </button>
          <button class="star-org flex-item" type="button"><i class="star starred material-icons">star</i></button>
        </div>
        <ul class="project-ul">
          <li class="user-li hide">
            <div class="project-list project-flex-container">
              <a href="__BASE_PATH__/weblabs/playground" class="project-item project-item-container sidebar-project-link sidebar-row-link">
                <div class="flex-item site-logo all-project-names"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                <div class="projectName-owner flex-item"><div class="project-name flex-item">playground <i class="yobicon-lock yobicon-small"></i></div></div>
              </a>
              <button class="star-project flex-item" type="button"><i class="star material-icons">star</i></button>
            </div>
          </li>
        </ul>
      </li>
      <ul class="etc-favorites"></ul>
      <li class="user-li">
        <div class="project-list project-flex-container">
          <div class="project-item project-item-container">
            <a href="__BASE_PATH__/external/member">
            <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
              <div class="project-name flex-item">member </div>
          </a>
            <div class="projectName-owner flex-item">
              <div class="project-owner flex-item"><a href="__BASE_PATH__/external">external</a></div>
            </div>
          </div>
          <button class="star-project flex-item" type="button"><i class="star starred material-icons">star</i></button>
        </div>
      </li>
    </ul>
  </div>
</div>
`;

const EXPECTED_SIDEBAR_PROJECT_TAB = `
<div class="tab-pane user-project-list active" id="myProjectList">
  <div>
    <div class="search-result">
      <div class="tab-pane myproject-list-wrap">
        <div class="group">
          <input class="search-input project-search" type="text" id="query" value="" autocomplete="off" placeholder="Type name">
          <span class="bar"></span>
        </div>
        <div class="subtab-wrap subtab-group">
          <ul class="nav-subtab unstyled">
            <li class="active"><button type="button">Recently visited</button></li>
            <li><button type="button">Create</button></li>
            <li><button type="button">Watching</button></li>
            <li><button type="button">Member</button></li>
          </ul>
        </div>
        <div class="tab-content">
          <ul class="tab-pane user-ul active" id="recentlyVisited">
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/admin/sample">
                    <div class="flex-item site-logo"><i class="project-avatar"><img class="logo" src="__BASE_PATH__/legacy-assets/images/project_default_logo.png"></i></div>
                    <div class="project-name flex-item">sample </div>
                  </a>
                  <div class="projectName-owner flex-item"><div class="project-owner flex-item"><a href="__BASE_PATH__/admin">admin</a></div></div>
                </div>
                <button class="star-project flex-item" type="button"><i class="star starred material-icons">star</i></button>
              </div>
            </li>
          </ul>
          <ul class="tab-pane user-ul " id="watching">
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/weblabs/playground">
                    <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                    <div class="project-name flex-item">playground <i class="yobicon-lock yobicon-small"></i></div>
                  </a>
                  <div class="projectName-owner flex-item"><div class="project-owner flex-item"><a href="__BASE_PATH__/weblabs">weblabs</a></div></div>
                </div>
                <button class="star-project flex-item" type="button"><i class="star material-icons">star</i></button>
              </div>
            </li>
          </ul>
          <ul class="tab-pane user-ul " id="createdByMe">
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/admin/sample">
                    <div class="flex-item site-logo"><i class="project-avatar"><img class="logo" src="__BASE_PATH__/legacy-assets/images/project_default_logo.png"></i></div>
                    <div class="project-name flex-item">sample </div>
                  </a>
                  <div class="projectName-owner flex-item"><div class="project-owner flex-item"><a href="__BASE_PATH__/admin">admin</a></div></div>
                </div>
                <button class="star-project flex-item" type="button"><i class="star starred material-icons">star</i></button>
              </div>
            </li>
          </ul>
          <ul class="tab-pane user-ul " id="joinmember">
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/external/member">
                    <div class="flex-item site-logo"><i class="project-avatar"><span class="dummy-25px"> </span></i></div>
                    <div class="project-name flex-item">member </div>
                  </a>
                  <div class="projectName-owner flex-item"><div class="project-owner flex-item"><a href="__BASE_PATH__/external">external</a></div></div>
                </div>
                <button class="star-project flex-item" type="button"><i class="star starred material-icons">star</i></button>
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
<div class="tab-pane user-project-list active" id="myRecentIssueList">
  <div>
    <div class="search-result">
      <div class="tab-pane myproject-list-wrap">
        <div class="group">
          <input class="search-input project-search" type="text" id="recent-issue-query" value="" autocomplete="off" placeholder="Type name">
          <span class="bar"></span>
        </div>
        <div class="tab-content">
          <ul class="tab-pane user-ul active" id="recentlyVisitedIssues">
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/admin/sample/issue/42">
                    <div class="issue-item projectName-owner flex-item">
                      <div class="issue-title-start">-</div><div class="issue-title flex-item">Crash on login</div>
                    </div>
                  </a>
                </div>
              </div>
            </li>
            <li class="user-li">
              <div class="project-list project-flex-container">
                <div class="project-item project-item-container">
                  <a href="__BASE_PATH__/weblabs/playground/issue/7">
                    <div class="issue-item projectName-owner flex-item">
                      <div class="issue-title-start">-</div><div class="issue-title flex-item">Review onboarding copy</div>
                    </div>
                  </a>
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

const DEFAULT_LANDING_CASES = [
  { expected: (basePath: string) => `${basePath}/me`, landing: () => "/me", name: "profile" },
  {
    expected: (basePath: string) => `${basePath}/notifications`,
    landing: () => "/notifications",
    name: "notifications",
  },
  {
    expected: (basePath: string) => `${basePath}/search?pageSize=20&scope=global`,
    landing: () => "/search?pageSize=20&scope=global",
    name: "search",
  },
  { expected: (basePath: string) => `${basePath}/`, landing: () => "/", name: "root" },
  {
    expected: (basePath: string) => `${basePath}/`,
    landing: (basePath: string) => basePath,
    name: "already-prefixed root",
  },
  {
    expected: (basePath: string) => `${basePath}/me`,
    landing: (basePath: string) => `${basePath}/me`,
    name: "already-prefixed profile",
  },
  {
    expected: (basePath: string) => `${basePath}/`,
    landing: () => "https://evil.example/escape",
    name: "external URL",
  },
  {
    expected: (basePath: string) => `${basePath}/`,
    landing: () => "//evil.example/escape",
    name: "scheme-relative URL",
  },
] as const;

for (const defaultLandingCase of DEFAULT_LANDING_CASES) {
  test(`authenticated index normalizes the ${defaultLandingCase.name} default landing inside the SPA`, async ({
    page,
  }) => {
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    const documentPaths: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "document") {
        documentPaths.push(new URL(request.url()).pathname);
      }
    });
    const session = await mockDeferredAuthenticatedDefaultLanding(
      page,
      defaultLandingCase.landing(basePath),
    );

    await page.goto(`${basePath}/`);
    await session.requested;
    await page.evaluate(() => {
      (
        window as Window & { __authenticatedHomeDefaultLandingSentinel?: string }
      ).__authenticatedHomeDefaultLandingSentinel = "alive";
    });
    session.release();

    await expect(page).toHaveURL(defaultLandingCase.expected(basePath));
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __authenticatedHomeDefaultLandingSentinel?: string })
              .__authenticatedHomeDefaultLandingSentinel,
        ),
      )
      .toBe("alive");
    expect(documentPaths).toEqual([`${basePath}/`]);
  });
}

test("shared shell logo keeps navbar Link with StyleX ownership", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);

  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const logoLink = page.locator('[data-stylex-owner="global-gnb-brand-link"]');
  await expect(logoLink).toHaveText("Y");
  await expect(logoLink).toHaveAttribute("href", `${basePath}/`);
  await expect(logoLink).toHaveClass(/(?:^|\s)logo(?:\s|$)/u);
  await expect(logoLink).toHaveClass(/(?:^|\s)logo-letter(?:\s|$)/u);
  await expect(logoLink).toHaveAttribute("aria-current", "page");
  await expect(logoLink).toHaveAttribute("data-status", "active");

  await page.goto(`${basePath}/notifications`);
  await page.evaluate(() => {
    (
      window as Window & { __authenticatedHomeLogoSpaMarker?: string }
    ).__authenticatedHomeLogoSpaMarker = "logo";
  });
  await page.locator('[data-stylex-owner="global-gnb-brand-link"]').click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toMatch(new RegExp(`^${escapeRegExp(basePath)}/?$`, "u"));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __authenticatedHomeLogoSpaMarker?: string })
            .__authenticatedHomeLogoSpaMarker,
      ),
    )
    .toBe("logo");

  expect(routeSource).not.toContain("LegacyHrefLink");
  expect(routeSource).not.toContain("LegacyLogoLink");
  expect(routeSource).not.toContain("LegacyLogoLinkAnchor");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("reactJsx");
  expect(routeSource).not.toContain("legacyHref");
  expect(routeSource).toContain("<Link\n                activeOptions={{");
  expect(routeSource).toContain('data-stylex-owner="global-gnb-brand-link"');
  expect(routeSource).toContain("className={`logo logo-letter");
  expect(routeSource).toContain("globalGnbBrandLinkStyles = stylex.create");
  expect(routeSource).toContain('to="/"');
  expect(routeSource).not.toContain(["use", "Link", "Props"].join(""));
  expect(routeSource).not.toContain(["Legacy", "Href", "Anchor"].join(""));
  expect(routeSource).not.toContain(["React", "createElement"].join("."));
  expect(routeSource).not.toContain(["forward", "Ref"].join(""));
  expect(routeSource).not.toContain("CreateLinkProps");
});

test("authenticated home route has no generic LegacyInternalLink adapter", () => {
  const indexRouteSource = readFileSync("src/routes/index.tsx", "utf8");
  const notificationsRouteSource = readFileSync("src/routes/notifications.tsx", "utf8");
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const legacySources = {
    footer: readFileSync("../yona-original/app/views/common/footer.scala.html", "utf8"),
    index: readFileSync("../yona-original/app/views/index/index.scala.html", "utf8"),
    navbar: readFileSync("../yona-original/app/views/common/navbar.scala.html", "utf8"),
    notifications: readFileSync(
      "../yona-original/app/views/index/notifications.scala.html",
      "utf8",
    ),
    partialNotifications: readFileSync(
      "../yona-original/app/views/index/partial_notifications.scala.html",
      "utf8",
    ),
    layout: readFileSync("../yona-original/app/views/layout.scala.html", "utf8"),
    siteLayout: readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8"),
    usermenu: readFileSync("../yona-original/app/views/common/usermenu.scala.html", "utf8"),
  };
  const fullHomeRouteSources = `${indexRouteSource}\n${notificationsRouteSource}`;

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("as never");
  expect(routeSource).not.toContain("as unknown as");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("reactJsx");
  expect(routeSource).not.toContain("LegacyLogoLink");
  expect(routeSource).not.toContain("LegacyLogoLinkAnchor");
  expect(routeSource).not.toContain("legacyHref");
  expect(routeSource).not.toContain(["use", "Link", "Props"].join(""));
  expect(routeSource).not.toContain(["Legacy", "Href", "Anchor"].join(""));
  expect(routeSource).not.toContain(["React", "createElement"].join("."));
  expect(routeSource).not.toContain(["forward", "Ref"].join(""));
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(fullHomeRouteSources).not.toContain("document.title");
  expect(fullHomeRouteSources).not.toContain("globalThis.document");
  expect(fullHomeRouteSources).not.toContain("window.document");
  expect(fullHomeRouteSources).not.toMatch(/useEffect[\s\S]{0,120}title/u);
  expect(indexRouteSource).toContain('<title>{runtimeConfig.siteName ?? "Yoram"}</title>');
  expect(notificationsRouteSource).toContain('<title>{runtimeConfig.siteName ?? "Yoram"}</title>');
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).not.toMatch(/<a[\s>]/u);
  expect(routeSource).not.toContain("document.dispatchEvent");
  expect(routeSource).not.toContain('data-toggle="yobi-notify"');
  expect(routeSource).toContain("const LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS = {");
  expect(routeSource).toContain(
    "activeOptions: { exact: true, explicitUndefined: true, includeSearch: true }",
  );
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain('const PROJECT_FORM_PATH: string = "/projectform"');
  expect(routeSource).toContain(
    'const LEGACY_NOTIFICATION_NEW_ISSUE_PATH: string = "/user/issues/new"',
  );
  expect(routeSource).toContain(
    'const LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH: string = "/user/issues/new/mine"',
  );
  expect(routeSource).toContain("to={notification.targetHref}");
  expect(routeSource).toContain('data-stylex-owner="site-footer-provider"');
  expect(routeSource).toContain("Yoram authors");
  expect(routeSource).toContain("const feedbackUrl = runtimeConfig.feedbackUrl?.trim()");
  expect(routeSource).not.toContain("https://github.com/yona-projects/yona/issues");
  expect(routeSource).toContain("to={navbarCustomLinkUrl}");
  expect(routeSource).toContain("to={LEGACY_AUTHENTICATED_LOGOUT_PATH}");
  expect(routeSource).toContain("user-menu logout label");
  expect(routeSource).toContain("to={LEGACY_NOTIFICATION_NEW_ISSUE_PATH}");
  expect(routeSource).toContain("to={LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH}");
  expect(routeSource).not.toContain(
    "href={prefixBasePath(basePath, LEGACY_AUTHENTICATED_LOGOUT_PATH)}",
  );
  expect(routeSource).toContain('to="/projectform"');

  expect(legacySources.index).toContain("@views.html.index.notifications(currentUser)");
  expect(legacySources.notifications).toContain("@siteLayout(utils.Config.getSiteName");
  expect(legacySources.notifications).toContain("@partial_notifications(0, 20)");
  expect(legacySources.siteLayout).toContain("@layout(Messages(title))");
  expect(legacySources.layout).toContain('@titleArray = @{title.split(" \\\\|:\\\\| ")}');
  expect(legacySources.layout).toContain("<title>@titleArray(0)</title>");
  expect(legacySources.partialNotifications).toContain('data-toggle="learnmore"');
  expect(legacySources.partialNotifications).toContain('id="notification-more"');
  expect(legacySources.navbar).toContain("@common.usermenu()");
  expect(legacySources.navbar).toContain("gnb-search-form");
  expect(legacySources.usermenu).toContain("Application.NAVBAR_CUSTOM_LINK_URL");
  expect(legacySources.usermenu).toContain("routes.UserApp.logout()");
  expect(legacySources.usermenu).toContain("routes.IssueApp.newDirectIssueForm()");
  expect(legacySources.usermenu).toContain("routes.ProjectApp.newProjectForm()");
  expect(legacySources.footer).toContain(
    "https://github.com/yona-projects/yona/blob/master/AUTHORS",
  );
  expect(legacySources.footer).toContain("https://www.ncloud.com/?referer=yona");
  expect(legacySources.siteLayout).toContain("@common.navbar(menuType, null, null)");
  expect(legacySources.siteLayout).toContain("@common.footer()");
});

test("anonymous home shell renders React-owned login and React-owned signup Link affordances", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAnonymousSession(page);

  await page.goto(`${basePath}/`);

  const loginLink = page.locator("#required-logged-in a.user-item-btn");
  const signupMenuLink = page.locator('[data-stylex-owner="anonymous-site-signup"]');
  const landingSignupLink = page.locator('[data-stylex-owner="anonymous-home-intro-signup-link"]');
  const projectListLink = page.locator('[data-stylex-owner="global-gnb-project-list-link"]');
  const profileLink = page.locator("#mySidenav .user-menu a").first();
  const logoutLink = page.locator("#mySidenav a:has(.logout)");
  const resetPasswordLink = page.locator("#loginDialog .act-row a").nth(0);
  const dialogSignupLink = page.locator("#loginDialog .act-row a").nth(1);

  await expect(loginLink).toHaveText("Log in");
  await expect(loginLink).toHaveAttribute("href", `${basePath}/users/loginform`);
  await expect(loginLink).toHaveClass(/(?:^|\s)user-item-btn(?:\s|$)/u);
  await expect(loginLink).not.toHaveAttribute("data-login");
  await expect(loginLink).toHaveAttribute("aria-controls", "loginDialog");
  await expect(loginLink).toHaveAttribute("aria-haspopup", "dialog");
  await expect(signupMenuLink).toHaveText("Sign up");
  await expect(signupMenuLink).toHaveAttribute("href", `${basePath}/users/signupform`);
  await expect(signupMenuLink).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(signupMenuLink).not.toHaveClass(/(?:^|\s)ybtn-success(?:\s|$)/u);
  await expect(landingSignupLink).toHaveText("Sign up for Yoram");
  await expect(landingSignupLink).toHaveAttribute("href", `${basePath}/users/signupform`);
  await expect(landingSignupLink).not.toHaveAttribute("class", /(?:^|\s)ybtn(?:\s|$)/u);
  await expect(projectListLink).toHaveCount(0);
  await expect(profileLink).toHaveAttribute("href", `${basePath}/anonymous`);
  await expect(profileLink).not.toHaveAttribute("aria-current");
  await expect(profileLink).not.toHaveAttribute("data-status");
  await expect(logoutLink).toHaveAttribute("href", `${basePath}/logout`);
  await loginLink.click();
  await expect(resetPasswordLink).toHaveAttribute("href", `${basePath}/lostPassword`);
  await expect(dialogSignupLink).toHaveAttribute("href", `${basePath}/users/signupform`);
});

test("root login submit refreshes the authenticated home shell without a document reload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const sessionRequestPaths: string[] = [];
  const signInRequests: Array<{ body: unknown; csrfToken: string | undefined }> = [];
  let authenticated = false;

  await page.route("**/api/v1/session", async (route) => {
    sessionRequestPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        authenticated
          ? {
              actorId: 1,
              avatarUrl: "/legacy-assets/images/default-avatar-34.png",
              defaultLandingPath: "/",
              emailAddress: "admin@example.com",
              isAnonymous: false,
              isConfirmed: true,
              isGuest: false,
              isSiteAdmin: true,
              loginId: "admin",
              userLabel: "Site Admin",
            }
          : {
              actorId: null,
              defaultLandingPath: "/",
              emailAddress: "",
              isAnonymous: true,
              isConfirmed: false,
              isSiteAdmin: false,
              loginId: "",
              userLabel: "",
            },
      ),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-root-login" },
      body: JSON.stringify({ isAnonymous: !authenticated }),
    });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
    signInRequests.push({
      body: route.request().postDataJSON(),
      csrfToken: route.request().headers()["x-csrf-token"],
    });
    authenticated = true;
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
      }),
    });
  });
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabledSocialProviders: [], socialLoginOnly: false }),
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ hasMore: false, items: [], total: 0 }),
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/legacy-assets/images/default-avatar-34.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    });
  });

  await page.goto(`${basePath}/`);
  const initialUrl = page.url();
  await page.evaluate(() => {
    (window as Window & { __rootLoginSpaSentinel?: string }).__rootLoginSpaSentinel = "alive";
  });

  await page.locator("#required-logged-in a.user-item-btn").click();
  await page.locator("#loginIdOrEmailD").fill("admin");
  await page.locator("#passwordD").fill("password");
  await page.locator("#loginDialog button[type='submit']").click();

  await expect(page.locator(".gnb-usermenu a.user-item-btn.loggged-in")).toHaveText("My Issues");
  await expect(page.locator("#loginDialog")).toBeHidden();
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
  await expect(page).toHaveURL(initialUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __rootLoginSpaSentinel?: string }).__rootLoginSpaSentinel,
      ),
    )
    .toBe("alive");
  await expect
    .poll(() => sessionRequestPaths)
    .toEqual([`${basePath}/api/v1/session`, `${basePath}/api/v1/session`]);
  expect(signInRequests).toEqual([
    {
      body: { identifier: "admin", password: "password", rememberMe: true },
      csrfToken: "csrf-root-login",
    },
  ]);
});

test("authenticated home empty notifications matches legacy index notifications screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);
  await expect(page).toHaveTitle("Yoram");
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .evaluateAll((titles) => titles.map((title) => title.textContent ?? "")),
    )
    .toContain("Yoram");
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-page-wrap-outer"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-notification-list"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-notification-empty"]'),
  ).toContainText("No notification");
  await expect(
    page.locator(
      ".myOrganizationList, .myProjectList, .myRecentIssueList, #usermenu-tab-content-list",
    ),
  ).toHaveCount(4);
  await page.route("**/api/v1/user/issues?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "assigned",
        items: [],
        openIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: "open",
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_AUTHENTICATED_HOME.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopAuthenticatedHomeMetrics(page)).toEqual(
    EXPECTED_EMPTY_NOTIFICATION_DESKTOP_METRICS,
  );
  const introGuide = page.locator('[data-stylex-owner="authenticated-home-intro-guide"]');
  await expect(introGuide).toBeVisible();
  await page.locator("#toggleIntro").click();
  await expect(introGuide).toBeHidden();
  expect(await readLocalStorageValue(page, "yobi-intro")).toBe("false");
  await page.reload();
  await expect(introGuide).toBeHidden();
  await page.locator("#toggleIntro").click();
  await expect(introGuide).toBeVisible();
  expect(await readLocalStorageValue(page, "yobi-intro")).toBe("true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileAuthenticatedHomeMetrics(page)).toEqual({
    defaultLandingButtonDisplay: null,
    mainStreamWidth: 390,
    pageWrapOuterWidth: 390,
    siteGuideOuterMargin: "40px 0px 0px",
  });

  await page.setViewportSize({ width: 1100, height: 720 });
  const homeStreamTabs = page.locator(
    '[data-stylex-owner="authenticated-home-main-stream"] > [data-stylex-owner="authenticated-home-series-tabs"]',
  );
  await expect(homeStreamTabs).not.toHaveClass(/(?:^|\s)(?:nav|nav-tabs)(?:\s|$)/u);
  await expect(homeStreamTabs.locator("> li").nth(0)).not.toHaveClass(/active/u);
  await expect(homeStreamTabs.locator("> li > a")).toHaveText([
    "Notification",
    "My Issues",
    "My Files",
  ]);
  await expect(homeStreamTabs.locator("> li > a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/notifications`,
  );
  await expect(homeStreamTabs.locator("> li > a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/user/issues`,
  );
  await expect(homeStreamTabs.locator("> li > a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/user/files`,
  );
  await expect(homeStreamTabs.locator("> li > a.active")).toHaveCount(0);
  for (const tabLink of await homeStreamTabs.locator("> li > a").all()) {
    await expect(tabLink).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-home-series-tab-link",
    );
    await expect(tabLink).not.toHaveAttribute("title");
    await expect(tabLink).not.toHaveAttribute("aria-current");
    await expect(tabLink).not.toHaveAttribute("data-status");
  }

  const gnbMyIssues = page.locator(".gnb-usermenu a.user-item-btn.loggged-in", {
    hasText: "My Issues",
  });
  await expect(gnbMyIssues).toHaveAttribute("href", `${basePath}/user/issues`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "gnb-my-issues";
  });
  await gnbMyIssues.click();
  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&query=&state=open`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("gnb-my-issues");

  await page.goto(`${basePath}/`);
  await mockSiteUsers(page);
  const siteAdminLink = page.locator(".gnb-usermenu a.usermenu-icon-button.show-progress-bar");
  await expect(siteAdminLink).toHaveAttribute("href", `${basePath}/sites/userList`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "gnb-site-admin";
  });
  await siteAdminLink.scrollIntoViewIfNeeded();
  await siteAdminLink.click();
  await expect(page).toHaveURL(`${basePath}/sites/userList`);
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("gnb-site-admin");

  await page.goto(`${basePath}/`);
  const accountActions = page.locator(
    '#mySidenav [data-stylex-owner="authenticated-sidenav-account-actions"]',
  );
  const profileLink = accountActions.locator("a", { hasText: "Profile" });
  const accountLink = accountActions.locator("a", { hasText: "Account" });
  await expect(profileLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(accountLink).toHaveAttribute("href", `${basePath}/user/editform`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "side-account";
  });
  await accountLink.evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page).toHaveURL(`${basePath}/user/editform`);
  await expect(page.locator(".site-breadcrumb-inner h3")).toHaveText("Account");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("side-account");

  await page.goto(`${basePath}/`);
  const createProjectLink = page.locator(".gnb-usermenu .dropdown-menu a", {
    hasText: "Create new project",
  });
  const newGroupLink = page.locator(".gnb-usermenu .dropdown-menu a", { hasText: "New Group" });
  await expect(createProjectLink).toHaveAttribute("href", `${basePath}/projectform`);
  await expect(newGroupLink).toHaveAttribute("href", `${basePath}/organizations/new`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "gnb-new-group";
  });
  await newGroupLink.evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page).toHaveURL(`${basePath}/organizations/new`);
  await expect(page.locator('form[name="new-org"] legend')).toHaveText("New Group");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("gnb-new-group");
});

test("authenticated home flash renders legacy toast without route-local notify scan", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  const routeSource = readFileSync("src/routes/index.tsx", "utf8");

  expect(routeSource).toContain("const { signup, verify } = Route.useSearch();");
  expect(routeSource).toContain('signup === "requested"');
  expect(routeSource).toContain('verify === "sent"');
  expect(routeSource).not.toContain("window.location.search");
  expect(routeSource).not.toContain("new URLSearchParams(window.location.search)");

  await page.goto(`${basePath}/?signup=requested`);
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-notification-empty"]'),
  ).toContainText("No notification has been received.");

  const toast = page.locator('[data-stylex-owner="root-yoram-toast"]', {
    hasText:
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
  });
  await expect(toast).toBeVisible();
  await expect(toast.locator('[data-stylex-part="toast-message"]')).toHaveText(
    "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
  );
  await toast.locator("button").click();
  await expect(toast).toHaveCount(0);

  await page.goto(`${basePath}/?verify=sent`);
  const verificationToast = page.locator('[data-stylex-owner="root-yoram-toast"]', {
    hasText: "User verification mail was sent.",
  });
  await expect(verificationToast).toBeVisible();
  await expect(verificationToast.locator('[data-stylex-part="toast-message"]')).toHaveText(
    "User verification mail was sent.",
  );
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
  await expect(page.locator("#mySidenav a:has(.user-menu.logout.label)")).toHaveAttribute(
    "href",
    `${basePath}/users/logout`,
  );
  await expect(menuItems.nth(1)).not.toHaveAttribute("data-toggle");
  await expect(menuItems.nth(1)).not.toHaveAttribute("data-placement");
  await expect(menuItems.nth(1)).toHaveAttribute("title", "Shortcut (A)");
});

test("shared shell only renders the configured feedback link", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    (
      window as Window & {
        __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
      }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: "/yona",
      feedbackUrl: "https://feedback.example.test/yoram",
    };
  });
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);

  const feedbackLink = page.locator('[data-stylex-owner="global-gnb-nav"] a', {
    hasText: "Yoram repository",
  });
  await expect(feedbackLink).toHaveAttribute("href", "https://feedback.example.test/yoram");
  await expect(feedbackLink).toHaveAttribute("target", "_blank");
});

test("authenticated shared shell drops route-owned tooltip initializers but keeps metadata", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);

  await page.goto(`${basePath}/`);

  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const siteLayoutShellSource = routeSource.slice(
    routeSource.indexOf("export function SiteLayoutShell"),
    routeSource.indexOf("function AuthenticatedSiteUserMenu"),
  );
  const authenticatedUserMenuSource = routeSource.slice(
    routeSource.indexOf("function AuthenticatedSiteUserMenu"),
    routeSource.indexOf("function AnonymousSiteUserMenu"),
  );
  const legacySources = {
    navbar: readFileSync("../yona-original/app/views/common/navbar.scala.html", "utf8"),
    scripts: readFileSync("../yona-original/app/views/common/scripts.scala.html", "utf8"),
    usermenu: readFileSync("../yona-original/app/views/common/usermenu.scala.html", "utf8"),
  };

  expect(legacySources.navbar).toContain('data-toggle="tooltip"');
  expect(legacySources.usermenu).toContain('data-toggle="tooltip"');
  expect(legacySources.scripts).toContain('"[data-toggle=tooltip]"');
  expect(siteLayoutShellSource).not.toContain('data-toggle="tooltip"');
  expect(authenticatedUserMenuSource).not.toContain('data-toggle="tooltip"');
  expect(siteLayoutShellSource).not.toContain('data-placement="bottom"');
  expect(siteLayoutShellSource).toContain('title="Sidebar"');
  expect(authenticatedUserMenuSource).not.toContain('data-placement="bottom"');
  expect(authenticatedUserMenuSource).toContain('title={`${t("title.shortcut")} (A)`}');
  expect(authenticatedUserMenuSource).toContain('title={t("menu.siteAdmin")}');
  expect(authenticatedUserMenuSource).toContain(
    'title={`${t("user.menu")}, ${t("title.shortcut")} (F)`}',
  );

  const shellTooltipMetadata = [
    {
      locator: page.locator('[data-stylex-owner="global-sidebar-open-pin"]'),
      title: "Sidebar",
    },
    {
      locator: page.locator(".gnb-usermenu > li.gnb-usermenu-item").first(),
      title: "Shortcut (A)",
    },
    { locator: page.locator(".gnb-usermenu a.usermenu-icon-button"), title: "Site administration" },
    {
      locator: page.getByRole("button", { name: "User menu, Shortcut (F)" }),
      title: "User menu, Shortcut (F)",
    },
  ];

  for (const { locator, title } of shellTooltipMetadata) {
    await expect(locator).not.toHaveAttribute("data-toggle");
    await expect(locator).not.toHaveAttribute("data-placement");
    await expect(locator).toHaveAttribute("title", title);
  }
});

test("authenticated root sidebar favorite tab matches legacy index/myOrganizationList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);
  const favoriteRequests: string[] = [];
  await page.route("**/api/v1/owners/external/projects/member/favorite", async (route) => {
    favoriteRequests.push(route.request().method());
    await route.fulfill({ contentType: "application/json", body: "{}", status: 200 });
  });

  await page.goto(`${basePath}/`);
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await expect(page.locator("#usermenu-tab-content-list #organizations")).toBeVisible();
  await expect(page.locator("#usermenu-tab-content-list .org-li")).toHaveCount(2);
  await expect(page.locator("#usermenu-tab-content-list [data-toggle='popover']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-trigger='hover']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-placement='right']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-content]")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list .popover.right")).toHaveCount(0);
  await expect(
    page.locator("#usermenu-tab-content-list > .tab-pane.user-project-list"),
  ).toHaveCount(3);
  await expect(
    page.locator("#usermenu-tab-content-list > .user-project-list.active"),
  ).toHaveAttribute("id", "myOrganizationList");
  await expect(page.locator("#myOrganizationList [data-location]")).toHaveCount(0);
  const directRow = page.locator(
    "#myOrganizationList #organizations > .user-li:has-text('member')",
  );
  const directProjectLink = directRow.locator(
    ':scope > .project-list > .project-item > a[href$="/external/member"]',
  );
  const directOwnerLink = directRow.getByRole("link", { name: "external", exact: true });
  const directStarButton = directRow.locator("button.star-project");
  await expect(directProjectLink).toHaveCount(1);
  await expect(directProjectLink).toHaveAttribute("href", `${basePath}/external/member`);
  await expect(directProjectLink.locator(":scope > .site-logo")).toHaveCount(1);
  await expect(directProjectLink.locator(":scope > .project-name")).toHaveCount(1);
  await expect(directOwnerLink).toHaveCount(1);
  await expect(directOwnerLink).toHaveAttribute("href", `${basePath}/external`);
  await expect(directStarButton).toHaveCount(1);
  await expect(directStarButton).toHaveAccessibleName("Remove external/member from favorites");

  expect(await canonicalizeSelector(page, "#myOrganizationList")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_FAVORITE_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarFavoriteTabMetrics(page)).toEqual({
    logoWidth: 48,
    organizationCount: 2,
    organizationRowDisplay: "flex",
    organizationRowHeight: 25,
    projectCount: 3,
    projectRowDisplay: "flex",
    projectRowHeight: 26,
    rootWidth: 350,
    searchHeight: 42,
    searchPadding: "4px 6px",
    starWidth: 29,
  });

  const sampleProjectRow = page.locator(
    "#myOrganizationList .user-li:has(a[href$='/admin/sample']) > .project-list",
  );
  await expect(sampleProjectRow).not.toHaveAttribute("data-toggle");
  await expect(sampleProjectRow).not.toHaveAttribute("data-trigger");
  await expect(sampleProjectRow).not.toHaveAttribute("data-placement");
  await expect(sampleProjectRow).not.toHaveAttribute("data-content");
  await sampleProjectRow.hover();
  await expect(page.locator("#usermenu-tab-content-list .popover.right")).toHaveCount(0);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const favoriteGeometry = await readFavoriteProjectNavigationGeometry(directRow);
    expect(favoriteGeometry.logoRight).toBeLessThanOrEqual(favoriteGeometry.nameLeft);
    expect(favoriteGeometry.nameRight).toBeLessThanOrEqual(favoriteGeometry.ownerLeft);
    expect(favoriteGeometry.ownerRight).toBeLessThanOrEqual(favoriteGeometry.starLeft);
    expect(favoriteGeometry.logoLeft).toBeGreaterThanOrEqual(favoriteGeometry.rowLeft);
    expect(favoriteGeometry.starRight).toBeLessThanOrEqual(favoriteGeometry.rowRight);
    expect(favoriteGeometry.rowLeft).toBeGreaterThanOrEqual(favoriteGeometry.rootLeft);
    expect(favoriteGeometry.rowRight).toBeLessThanOrEqual(favoriteGeometry.rootRight);
    expect(favoriteGeometry.scrollWidth).toBeLessThanOrEqual(favoriteGeometry.clientWidth);
  }

  await directStarButton.click();
  await expect.poll(() => favoriteRequests).toEqual(["POST"]);
  await expect(directStarButton).toHaveAttribute("aria-pressed", "false");

  await directProjectLink.click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(basePath)}/external/member$`));
  await page.goto(`${basePath}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await directOwnerLink.click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `${basePath}/external` &&
      url.searchParams.get("daysAgo") === "14" &&
      url.searchParams.get("selected") === "issues",
  );
});

test("authenticated sidebar translates legacy favorite search and organization behavior to React", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  const favoriteApi = await mockWorkspaceSidebarFavoriteInteractions(page);
  await page.addInitScript(() => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await page.evaluate(() => {
    (window as Window & { __sidebarFavoriteSpaSentinel?: string }).__sidebarFavoriteSpaSentinel =
      "alive";
  });

  const favoriteRoot = page.locator("#myOrganizationList");
  const ownOrganization = favoriteRoot.locator("#organizations > .org-li", {
    has: page.locator(".org-name", { hasText: "admin" }),
  });
  await expect(ownOrganization.locator(".sub-project-counter")).toHaveText("2");
  await expect(favoriteRoot.locator("#organizations > .user-li")).toHaveCount(1);
  await expect(
    favoriteRoot
      .locator("#organizations > .user-li")
      .getByRole("link", { name: "Open external/shared" }),
  ).toHaveAttribute("href", `${basePath}/external/shared`);
  await expect(favoriteRoot.locator("#organizations > .user-li .yobicon-lock")).toHaveCount(1);

  const weblabsOrganization = favoriteRoot.locator(".org-li", { hasText: "weblabs" });
  await expect(weblabsOrganization.locator(":scope > .org-list .project-owner")).toHaveText("");
  const hiddenWip = weblabsOrganization.locator(".user-li", { hasText: "internal-wip" });
  const favoriteDocs = weblabsOrganization.locator(".user-li", { hasText: "docs" });
  await expect(hiddenWip).toBeHidden();
  await expect(favoriteDocs).toBeVisible();
  await weblabsOrganization.locator(":scope > .org-list .organization-toggle").click();
  await expect(hiddenWip).toBeVisible();
  await expect(favoriteDocs).toBeVisible();
  await weblabsOrganization.locator(":scope > .org-list .organization-toggle").click();
  await expect(hiddenWip).toBeHidden();
  await expect(favoriteDocs).toBeVisible();

  const orgSearch = favoriteRoot.locator(".org-search");
  await orgSearch.fill("internal-wip");
  await expect(weblabsOrganization).toBeVisible();
  await expect(hiddenWip).toBeVisible();
  await expect(favoriteDocs).toBeHidden();
  await orgSearch.fill("weblabs");
  await expect(weblabsOrganization).toBeVisible();
  await expect(hiddenWip).toBeHidden();
  await expect(favoriteDocs).toBeHidden();
  await orgSearch.fill("platform");
  const platformSearchResult = favoriteRoot.locator(".org-li", { hasText: "platform" });
  await expect(platformSearchResult).toBeVisible();
  await expect(platformSearchResult).not.toHaveClass(/favored/);
  await expect(ownOrganization).toBeHidden();
  await expect(weblabsOrganization).toBeHidden();
  await orgSearch.fill("external");
  await expect(favoriteRoot.locator("#organizations > .user-li")).toBeVisible();
  await expect(favoriteRoot.locator("#organizations > .org-li:visible")).toHaveCount(0);
  await orgSearch.fill("");

  const directFavoriteButton = favoriteRoot.locator(
    "#organizations > .user-li button.star-project",
  );
  const memberFavoriteButton = page.locator(
    "#myProjectList #joinmember .user-li:has(a[href$='/external/shared']) button.star-project",
  );
  const directOrderBefore = await favoriteRoot
    .locator("#organizations > .user-li a[aria-label^='Open ']")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  await expect(directFavoriteButton).toHaveAttribute("aria-pressed", "true");
  await expect(memberFavoriteButton).toHaveAttribute("aria-pressed", "true");
  await directFavoriteButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(directFavoriteButton).toBeDisabled();
  await expect.poll(() => favoriteApi.projectRequests.length).toBe(1);
  favoriteApi.releaseProjectFavorite();
  await expect(directFavoriteButton).toHaveAttribute("aria-pressed", "false");
  await expect(memberFavoriteButton).toHaveAttribute("aria-pressed", "true");
  expect(
    await favoriteRoot
      .locator("#organizations > .user-li a[aria-label^='Open ']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(directOrderBefore);

  const rightWeblabsFavorite = weblabsOrganization.locator(":scope > .org-list button.star-org");
  const leftWeblabsFavorite = page
    .locator(
      '#left-sidebar-organizations > [data-stylex-owner="left-sidebar-favorite-organization-rows"]',
    )
    .filter({ hasText: "weblabs" })
    .getByRole("button", { name: "Remove weblabs from favorites" });
  await rightWeblabsFavorite.click();
  await expect(rightWeblabsFavorite).toHaveAttribute("aria-pressed", "false");
  await expect(leftWeblabsFavorite).toHaveAttribute("aria-pressed", "true");

  const sampleFavorite = favoriteRoot.locator(
    ".user-li:has(a[href$='/admin/sample']) button.star-project",
  );
  const projectFailure = page.waitForEvent("dialog");
  await sampleFavorite.click();
  const projectDialog = await projectFailure;
  expect(projectDialog.message()).toBe("Update failed: project denied");
  await projectDialog.dismiss();
  await expect(sampleFavorite).toHaveAttribute("aria-pressed", "true");

  const platformOrganization = favoriteRoot.locator(".org-li", { hasText: "platform" });
  await expect(platformOrganization.locator(":scope > .org-list .project-owner")).toHaveText("1");
  const platformFavorite = platformOrganization.locator(":scope > .org-list button.star-org");
  const orgFailure = page.waitForEvent("dialog");
  await platformFavorite.click();
  const organizationDialog = await orgFailure;
  expect(organizationDialog.message()).toBe("Update failed: organization denied");
  await organizationDialog.dismiss();
  await expect(platformFavorite).toHaveAttribute("aria-pressed", "false");

  await page.locator("#mySidenav .myProjectList > button").click();
  await page.locator("#myProjectList .nav-subtab button", { hasText: "Create" }).click();
  await expect(page.locator("#myProjectList #createdByMe .user-li")).toHaveCount(2);
  await page.locator("#myProjectList .project-search").fill("sample");
  await expect(page.locator("#myProjectList #createdByMe .user-li:visible")).toHaveCount(1);
  await expect(page.locator("#myProjectList #createdByMe .user-li:visible")).toContainText(
    "sample",
  );

  await page.locator("#mySidenav .myRecentIssueList > button").click();
  const recentIssueSearch = page.locator("#myRecentIssueList .project-search");
  await expect(recentIssueSearch).toHaveValue("sample");
  await recentIssueSearch.fill("onboarding");
  await expect(page.locator("#myRecentIssueList .user-li:visible")).toHaveCount(1);
  await expect(page.locator("#myRecentIssueList .user-li:visible")).toContainText(
    "Review onboarding copy",
  );

  await recentIssueSearch.fill("");
  await page.locator("#mySidenav .myOrganizationList > button").click();
  expect(
    await favoriteRoot
      .locator("button.star-project, button.star-org")
      .first()
      .evaluate((button) => {
        const box = button.getBoundingClientRect();
        return { height: Math.round(box.height), width: Math.round(box.width) };
      }),
  ).toEqual({ height: 29, width: 29 });
  expect(
    await page.locator("#mySidenav .right-menu").evaluate((menu) => ({
      clientWidth: menu.clientWidth,
      scrollWidth: menu.scrollWidth,
    })),
  ).toMatchObject({ clientWidth: 350, scrollWidth: 350 });
  expect(favoriteApi.projectRequests).toEqual([
    {
      csrfToken: "csrf-sidebar-favorites",
      path: `${basePath}/api/v1/owners/external/projects/shared/favorite`,
    },
    {
      csrfToken: "csrf-sidebar-favorites",
      path: `${basePath}/api/v1/owners/admin/projects/sample/favorite`,
    },
  ]);
  expect(favoriteApi.organizationRequests).toEqual([
    {
      csrfToken: "csrf-sidebar-favorites",
      path: `${basePath}/api/v1/organizations/weblabs/favorite`,
    },
    {
      csrfToken: "csrf-sidebar-favorites",
      path: `${basePath}/api/v1/organizations/platform/favorite`,
    },
  ]);
  const organizationApiSource = readFileSync("src/api/org-project.ts", "utf8");
  expect(organizationApiSource).toContain("encodeURIComponent(organizationName)");
  expect(organizationApiSource).toContain('organizationPath(organizationName, "/favorite")');
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __sidebarFavoriteSpaSentinel?: string }).__sidebarFavoriteSpaSentinel,
    ),
  ).toBe("alive");
});

test("authenticated root user menu toggles stay route-local buttons without navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installAuthenticatedHomeDropdownBubbleAudit(page);
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  const initialUrl = page.url();
  const userMenu = page.locator('[data-stylex-owner="authenticated-site-user-menu"]');
  const sidebarToggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
  const createMenu = userMenu.locator(":scope > li.gnb-usermenu-dropdown").last();
  const createToggle = createMenu.locator(":scope > button");

  await expect(sidebarToggle).toHaveJSProperty("tagName", "BUTTON");
  await expect(sidebarToggle).toHaveAttribute("type", "button");
  await expect(sidebarToggle).not.toHaveClass(/gnb-dropdown-toggle/);
  await expect(sidebarToggle).not.toHaveAttribute("href", "javascript:void(0);");

  await expect(createToggle).toHaveJSProperty("tagName", "BUTTON");
  await expect(createToggle).toHaveAttribute("type", "button");
  await expect(createToggle).not.toHaveAttribute("data-toggle");
  await expect(createToggle).not.toHaveClass(/gnb-dropdown-toggle/);
  await expect(createToggle).not.toHaveClass(/dropdwon-box-btn/);
  await expect(createMenu.locator(":scope > a")).toHaveCount(0);
  await expect(page.locator(".gnb-usermenu a[href^='javascript:']")).toHaveCount(0);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "home-user-menu-toggles";
  });

  await expect(createMenu.locator(".dropdown-menu")).toBeHidden();
  await createToggle.click();
  await expect(createMenu.locator(".dropdown-menu")).toBeVisible();
  await expect(createMenu.locator(".dropdown-menu a")).toHaveText([
    "New issue",
    "New issue - personal inbox",
    "Create new project",
    "New Group",
  ]);
  expect(page.url()).toBe(initialUrl);
  await createToggle.click();
  await expect(createMenu.locator(".dropdown-menu")).toBeHidden();
  expect(page.url()).toBe(initialUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("home-user-menu-toggles");

  await sidebarToggle.click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  expect(page.url()).toBe(initialUrl);
  expect(await authenticatedHomeDropdownBubbleClicks(page)).toEqual([]);
});

test("shared shell keeps dropdown ownership inside route-local handlers", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const siteLayoutShellSource = routeSource.slice(
    routeSource.indexOf("export function SiteLayoutShell"),
    routeSource.indexOf("function AuthenticatedSiteUserMenu"),
  );
  const authenticatedUserMenuSource = routeSource.slice(
    routeSource.indexOf("function AuthenticatedSiteUserMenu"),
    routeSource.indexOf("function AnonymousSiteUserMenu"),
  );

  expect(siteLayoutShellSource).toContain("handleSearchScopeToggleClick");
  expect(siteLayoutShellSource).toContain("handleSearchScopeItemClick");
  expect(siteLayoutShellSource).toContain("setIsSearchScopeMenuOpen");
  expect(siteLayoutShellSource).toContain("event.preventDefault();");
  expect(siteLayoutShellSource).toContain("event.stopPropagation();");
  expect(siteLayoutShellSource).toContain('id="gnb-search-scope-title"');
  expect(siteLayoutShellSource).toContain('className="ybtn dropdown-toggle"');
  expect(siteLayoutShellSource).not.toContain('data-toggle="dropdown"');
  expect(siteLayoutShellSource).not.toContain("document.addEventListener");
  expect(siteLayoutShellSource).not.toContain("classList");
  expect(siteLayoutShellSource).not.toContain("style.display");

  expect(authenticatedUserMenuSource).toContain("handleSidebarToggleClick");
  expect(authenticatedUserMenuSource).toContain("handleCreateMenuToggleClick");
  expect(authenticatedUserMenuSource).toContain("handleCreateMenuBlur");
  expect(authenticatedUserMenuSource).toContain("event.preventDefault();");
  expect(authenticatedUserMenuSource).toContain("event.stopPropagation();");
  expect(authenticatedUserMenuSource).not.toContain("gnb-dropdown-toggle");
  expect(authenticatedUserMenuSource).not.toContain("dropdwon-box-btn");
  expect(authenticatedUserMenuSource).not.toContain('data-toggle="tooltip"');
  expect(authenticatedUserMenuSource).not.toContain('data-placement="bottom"');
  expect(authenticatedUserMenuSource).not.toContain('data-toggle="dropdown"');
  expect(authenticatedUserMenuSource).not.toContain("document.addEventListener");
  expect(authenticatedUserMenuSource).not.toContain("classList");
  expect(authenticatedUserMenuSource).not.toContain("style.display");
});

test("authenticated home create dropdown direct issue links keep legacy hrefs without reloadDocument", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const authenticatedUserMenuSource = routeSource.slice(
    routeSource.indexOf("function AuthenticatedSiteUserMenu"),
    routeSource.indexOf("function AnonymousSiteUserMenu"),
  );

  expect(authenticatedUserMenuSource).toContain(
    `<Link
                to={LEGACY_NOTIFICATION_NEW_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_ISSUE_PATH)}
              >`,
  );
  expect(authenticatedUserMenuSource).not.toContain(
    `<Link
                to={LEGACY_NOTIFICATION_NEW_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_ISSUE_PATH)}
                reloadDocument
              >`,
  );
  expect(authenticatedUserMenuSource).toContain(
    `<Link
                to={LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH)}
              >`,
  );
  expect(authenticatedUserMenuSource).not.toContain(
    `<Link
                to={LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH}
                href={prefixBasePath(basePath, LEGACY_NOTIFICATION_NEW_MY_ISSUE_PATH)}
                reloadDocument
              >`,
  );
});

test("authenticated home create dropdown new issue link preserves legacy href and uses SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);
  await mockDirectIssueFormDestination(page, {
    selectedProject: { ownerName: "admin", projectName: "sample" },
  });

  await page.goto(`${basePath}/`);

  const userMenu = page.locator('[data-stylex-owner="authenticated-site-user-menu"]');
  const createMenu = userMenu.locator(":scope > li.gnb-usermenu-dropdown").last();
  const createToggle = createMenu.locator(":scope > button");
  const newIssueLink = createMenu.locator(".dropdown-menu a", { hasText: /^New issue$/ });

  await expect(createToggle).not.toHaveAttribute("data-toggle");
  await createToggle.click();
  await expect(createMenu.locator(".dropdown-menu")).toBeVisible();
  await expect(newIssueLink).toHaveAttribute("href", `${basePath}/user/issues/new`);
  await page.evaluate(() => {
    (
      window as Window & { __authenticatedHomeCreateMenuSpaMarker?: string }
    ).__authenticatedHomeCreateMenuSpaMarker = "new-issue";
  });

  await newIssueLink.click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/user/issues/new`);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __authenticatedHomeCreateMenuSpaMarker?: string })
            .__authenticatedHomeCreateMenuSpaMarker,
      ),
    )
    .toBe("new-issue");
});

test("authenticated home create dropdown personal inbox link preserves legacy href and uses SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);
  await mockDirectIssueFormDestination(page, {
    selectedProject: { ownerName: "dev", projectName: "inbox" },
  });

  await page.goto(`${basePath}/`);

  const userMenu = page.locator('[data-stylex-owner="authenticated-site-user-menu"]');
  const createMenu = userMenu.locator(":scope > li.gnb-usermenu-dropdown").last();
  const createToggle = createMenu.locator(":scope > button");
  const personalInboxLink = createMenu.locator(".dropdown-menu a", {
    hasText: /^New issue - personal inbox$/,
  });

  await expect(createToggle).not.toHaveAttribute("data-toggle");
  await createToggle.click();
  await expect(createMenu.locator(".dropdown-menu")).toBeVisible();
  await expect(personalInboxLink).toHaveAttribute("href", `${basePath}/user/issues/new/mine`);
  await page.evaluate(() => {
    (
      window as Window & { __authenticatedHomeCreateMenuSpaMarker?: string }
    ).__authenticatedHomeCreateMenuSpaMarker = "mine";
  });

  await personalInboxLink.click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/user/issues/new/mine`);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __authenticatedHomeCreateMenuSpaMarker?: string })
            .__authenticatedHomeCreateMenuSpaMarker,
      ),
    )
    .toBe("mine");
});

test("authenticated left framed sidebar matches legacy desktop and mobile geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);
  await page.addInitScript(() => {
    localStorage.removeItem("shallWeOpenLeftNavigation");
    localStorage.removeItem("sidebarActiveMenu");
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);
  await page.evaluate(() => {
    (
      window as Window & {
        __leftFramedSidebarSpaSentinel?: string;
      }
    ).__leftFramedSidebarSpaSentinel = "alive";
  });

  const openPin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
  await expect(openPin).toHaveJSProperty("tagName", "BUTTON");
  await expect(openPin).toHaveAttribute("type", "button");
  await expect(openPin).toHaveAttribute("title", "Sidebar");
  await expect(openPin.locator(".yobicon-arrow-right")).toBeVisible();
  await expect(openPin.locator(".yobicon-arrow-left")).toBeHidden();
  await expect(page.locator("#sidebar")).toHaveCount(0);
  expect(await readDesktopClosedLeftSidebarMetrics(page)).toEqual({
    mainWidth: 1366,
    mainX: 0,
    pinHeight: 26,
    pinWidth: 25,
    pinX: -6,
    pinY: 6,
  });

  await openPin.click();

  const leftSidebar = page.locator("#sidebar");
  await expect(leftSidebar).toHaveAttribute("data-sidebar-motion", "opening");
  const sidebarTransitionSettled = leftSidebar.evaluate((element) => {
    return new Promise<void>((resolve) => {
      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.target !== element || event.propertyName !== "width") {
          return;
        }
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      };
      element.addEventListener("transitionend", handleTransitionEnd);
    });
  });
  await sidebarTransitionSettled;
  await expect(leftSidebar).toHaveAttribute("data-sidebar-motion", "open");
  const closePin = leftSidebar.getByRole("button", { name: "Sidebar" });
  await expect(leftSidebar).toBeVisible();
  await expect(
    leftSidebar.locator('[data-stylex-owner="left-sidebar-profile-identity"] img'),
  ).toHaveAttribute("src", `${basePath}/legacy-assets/images/default-avatar-34.png`);
  await expect(page.locator(".gnb-usermenu .avatar-wrap img")).toHaveAttribute(
    "src",
    `${basePath}/legacy-assets/images/default-avatar-34.png`,
  );
  await expect(closePin).toHaveJSProperty("tagName", "BUTTON");
  await expect(closePin).toHaveAttribute("type", "button");
  await expect(closePin).toHaveAttribute("title", "Sidebar");
  await expect(closePin.locator(".yobicon-arrow-left")).toBeVisible();
  await expect(closePin.locator(".yobicon-arrow-right")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(1);
  await expect(page.locator('iframe[name="mainFrame"]')).toHaveCount(0);
  await expect(page.locator('[target="mainFrame"]')).toHaveCount(0);
  await expect(
    leftSidebar.locator(
      "[data-toggle], [data-placement], [data-location], [data-organization-id], [data-project-id]",
    ),
  ).toHaveCount(0);
  expect(await readDesktopOpenLeftSidebarMetrics(page)).toEqual({
    leftAvatarNaturalWidth: 34,
    mainBackground: "rgb(255, 255, 255)",
    mainHeight: 900,
    mainWidth: 1095,
    mainX: 271,
    pinHeight: 26,
    pinWidth: 24,
    pinX: 246,
    pinY: 9,
    rightAvatarNaturalWidth: 34,
    sidebarHeight: 900,
    sidebarWidth: 271,
    sidebarX: 0,
    sidebarY: 0,
  });
  expect(await readLeftSidebarTabMetrics(page)).toEqual({
    contentTop: 105,
    firstThreeFontWeights: ["700", "700", "700"],
    navHeight: 61,
    refreshHeight: 29,
    refreshPadding: "12px 0px 0px 6px",
    refreshWidth: 19,
    searchHeight: 42,
    searchTop: 105,
    tabTops: [44, 44, 44, 78],
    tabWidths: [74, 68, 118, 19],
  });
  expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe("true");
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await expect(leftSidebar).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileOpenLeftSidebarMetrics(page)).toEqual({
    leftAvatarNaturalWidth: 34,
    mainBackground: "rgb(255, 255, 255)",
    mainHeight: 844,
    mainWidth: 390,
    mainX: 0,
    rightAvatarNaturalWidth: 34,
    sidebarHeight: 844,
    sidebarPosition: "absolute",
    sidebarWidth: 271,
    sidebarX: 0,
    sidebarY: 0,
  });
  expect(await readLeftSidebarTabMetrics(page)).toEqual({
    contentTop: 78,
    firstThreeFontWeights: ["700", "700", "700"],
    navHeight: 34,
    refreshHeight: 29,
    refreshPadding: "12px 0px 0px 6px",
    refreshWidth: 19,
    searchHeight: 42,
    searchTop: 78,
    tabTops: [44, 44, 44, 44],
    tabWidths: [64, 58, 108, 19],
  });
  await expect(page.locator(".modal-backdrop, .sidebar-backdrop")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(leftSidebar).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe("true");

  const beforeCloseUrl = page.url();
  await closePin.click();
  await expect(leftSidebar).toHaveCount(0);
  await expect(page).toHaveURL(beforeCloseUrl);
  expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe(
    "false",
  );
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & {
            __leftFramedSidebarSpaSentinel?: string;
          }
        ).__leftFramedSidebarSpaSentinel,
    ),
  ).toBe("alive");
});

test("authenticated left framed sidebar persists tabs refreshes Query and keeps SPA Links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  const workspace = await mockWorkspaceSidebarProjects(page);
  await page.addInitScript(() => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);

  const leftSidebar = page.locator("#sidebar");
  const leftTabs = leftSidebar.locator('[data-stylex-owner="left-sidebar-tabs"]');
  const favoriteTab = leftTabs.getByRole("button", { exact: true, name: "Favorite" });
  const projectTab = leftTabs.getByRole("button", { exact: true, name: "Project" });
  const recentTab = leftTabs.getByRole("button", { exact: true, name: "Recent History" });
  await expect(leftSidebar).toBeVisible();
  await expect(favoriteTab).toHaveAttribute("aria-pressed", "true");
  await expect(projectTab).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#left-sidebar-tab-content-list")).toHaveCount(1);
  await expect(page.locator("#usermenu-tab-content-list")).toHaveCount(1);
  await expect(page.locator("#left-sidebar-tab-content-list > .user-project-list")).toHaveCount(3);
  await expect(
    page.locator("#left-sidebar-tab-content-list > .user-project-list:visible"),
  ).toHaveAttribute("id", "left-sidebar-myOrganizationList");
  expect(await duplicateSidebarIds(page)).toEqual([]);

  await projectTab.click();
  await expect(projectTab).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
    "myProjectList",
  );
  await page.reload();
  await expect(
    page
      .locator('#sidebar [data-stylex-owner="left-sidebar-tabs"]')
      .getByRole("button", { exact: true, name: "Project" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator("#left-sidebar-tab-content-list > .user-project-list:visible"),
  ).toHaveAttribute("id", "left-sidebar-myProjectList");
  expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe("true");

  const requestCountBeforeRefresh = workspace.requestCount;
  await leftTabs.getByRole("button", { name: "Refresh" }).click();
  await expect.poll(() => workspace.requestCount).toBeGreaterThan(requestCountBeforeRefresh);

  await recentTab.click();
  expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
    "myRecentIssueList",
  );
  await page.reload();
  await expect(
    page
      .locator('#sidebar [data-stylex-owner="left-sidebar-tabs"]')
      .getByRole("button", { exact: true, name: "Recent History" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator("#left-sidebar-tab-content-list > .user-project-list:visible"),
  ).toHaveAttribute("id", "left-sidebar-myRecentIssueList");
  expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
    "myRecentIssueList",
  );

  await expect(page.locator("#sidebar a[href$='/admin/sample/issue/42']")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/42`,
  );
  await page
    .locator('#sidebar [data-stylex-owner="left-sidebar-tabs"]')
    .getByRole("button", { exact: true, name: "Project" })
    .click();
  const projectLink = page.locator("#left-sidebar-myProjectList a[href$='/admin/sample']").first();
  await expect(projectLink).toHaveAttribute("href", `${basePath}/admin/sample`);
  await page.evaluate(() => {
    (
      window as Window & {
        __leftSidebarLinkSpaSentinel?: string;
      }
    ).__leftSidebarLinkSpaSentinel = "alive";
  });
  await projectLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin/sample`);
  await expect(page.locator("#sidebar")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & {
            __leftSidebarLinkSpaSentinel?: string;
          }
        ).__leftSidebarLinkSpaSentinel,
    ),
  ).toBe("alive");

  const accountLink = page.locator("#sidebar .user-menu a[href$='/user/editform']");
  await expect(accountLink).toHaveAttribute("href", `${basePath}/user/editform`);
  await accountLink.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/user/editform`);
  await expect(page.locator("#sidebar")).toBeVisible();
  await expect(
    page.locator("[data-location], [data-organization-id], [data-project-id]"),
  ).toHaveCount(0);
});

test("authenticated root sidebar project tab matches legacy index/myProjectList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);
  const favoriteRequests: string[] = [];
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    favoriteRequests.push(route.request().method());
    await route.fulfill({ contentType: "application/json", body: "{}", status: 200 });
  });

  await page.goto(`${basePath}/`);
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await expect(page.locator("#mySidenav .nav.nav-tabs.nm a[href^='#']")).toHaveCount(0);
  await expect(page.locator("#mySidenav .nav.nav-tabs.nm button")).toHaveText([
    "Favorite",
    "Project",
    "Recent History",
  ]);
  for (const tabButton of await page.locator("#mySidenav .nav.nav-tabs.nm button").all()) {
    await expect(tabButton).toHaveAttribute("type", "button");
    await expect(tabButton).not.toHaveAttribute("data-toggle");
    await expect(tabButton).not.toHaveAttribute("href");
  }

  const sidebarTabUrl = page.url();
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "home-sidebar-top-tabs";
  });
  await page.locator(".myProjectList button").click();
  await expect(page.locator(".myProjectList")).toHaveClass(/active/);
  await expect(page.locator("#myProjectList .project-search")).toBeVisible();
  await expect(page.locator("#myProjectList .user-li")).toHaveCount(4);
  expect(page.url()).toBe(sidebarTabUrl);
  await page.locator(".myRecentIssueList button").click();
  await expect(page.locator(".myRecentIssueList")).toHaveClass(/active/);
  await expect(page.locator("#usermenu-tab-content-list #recentlyVisitedIssues")).toHaveClass(
    /active/,
  );
  expect(page.url()).toBe(sidebarTabUrl);
  await page.locator(".myOrganizationList button").click();
  await expect(page.locator(".myOrganizationList")).toHaveClass(/active/);
  await expect(page.locator("#usermenu-tab-content-list #organizations")).toBeVisible();
  expect(page.url()).toBe(sidebarTabUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("home-sidebar-top-tabs");

  await page.locator(".myProjectList button").click();
  await expect(page.locator("#usermenu-tab-content-list .nav-subtab a[href^='#']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list .nav-subtab button")).toHaveText([
    "Recently visited",
    "Create",
    "Watching",
    "Member",
  ]);
  for (const tabButton of await page
    .locator("#usermenu-tab-content-list .nav-subtab button")
    .all()) {
    await expect(tabButton).toHaveAttribute("type", "button");
    await expect(tabButton).not.toHaveAttribute("data-toggle");
    await expect(tabButton).not.toHaveAttribute("href");
  }

  await expect(
    page.locator("#usermenu-tab-content-list > .user-project-list.active"),
  ).toHaveAttribute("id", "myProjectList");
  expect(await canonicalizeSelector(page, "#myProjectList")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_PROJECT_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarProjectTabMetrics(page)).toEqual({
    activePaneDisplay: "block",
    logoWidth: 26,
    ownerFontSize: "12px",
    projectCount: 4,
    projectRowDisplay: "flex",
    projectRowHeight: 26,
    rootWidth: 350,
    searchHeight: 42,
    searchPadding: "4px 6px",
    subtabDisplay: "block",
    subtabMarginTop: "0px",
  });

  const paneRows = [
    ["recentlyVisited", "Recently visited", "admin", "sample"],
    ["createdByMe", "Create", "admin", "sample"],
    ["watching", "Watching", "weblabs", "playground"],
    ["joinmember", "Member", "external", "member"],
  ] as const;
  for (const [paneId, label, ownerName, projectName] of paneRows) {
    await page.locator("#myProjectList .nav-subtab button", { hasText: label }).click();
    const row = page.locator(`#myProjectList #${paneId} > .user-li`);
    const projectLink = row.locator(
      `:scope > .project-list > .project-item > a[href$="/${ownerName}/${projectName}"]`,
    );
    const ownerLink = row.getByRole("link", { name: ownerName, exact: true });
    await expect(projectLink).toHaveCount(1);
    await expect(projectLink.locator(":scope > .site-logo")).toHaveCount(1);
    await expect(projectLink.locator(":scope > .project-name")).toHaveCount(1);
    await expect(projectLink.locator("a")).toHaveCount(0);
    await expect(ownerLink).toHaveAttribute("href", `${basePath}/${ownerName}`);
    await expect(row.locator("button.star-project")).toHaveCount(1);
    await expect(row).not.toHaveAttribute("data-location");
    await expect(row.locator("[data-location], [data-project-id]")).toHaveCount(0);
  }

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [paneId, label] of paneRows) {
      await page.locator("#myProjectList .nav-subtab button", { hasText: label }).click();
      const geometry = await readProjectPaneRowGeometry(page, paneId);
      expect(geometry.logoRight).toBeLessThanOrEqual(geometry.nameLeft);
      expect(geometry.nameRight).toBeLessThanOrEqual(geometry.ownerLeft);
      expect(geometry.ownerRight).toBeLessThanOrEqual(geometry.starLeft);
      expect(geometry.rowLeft).toBeGreaterThanOrEqual(geometry.rootLeft);
      expect(geometry.rowRight).toBeLessThanOrEqual(geometry.rootRight);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.locator("#myProjectList .nav-subtab button", { hasText: "Recently visited" }).click();
  const sampleRow = page.locator("#myProjectList #recentlyVisited > .user-li");
  await sampleRow.locator("button.star-project").click();
  await expect.poll(() => favoriteRequests).toEqual(["POST"]);
  await expect(sampleRow.locator("button.star-project")).toHaveAttribute("aria-pressed", "false");

  const projectSearch = page.locator("#myProjectList .project-search");
  await projectSearch.fill("sample");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "home-project-subtabs";
  });
  const projectTabUrl = page.url();
  const expectedTabs = [
    ["createdByMe", "Create"],
    ["watching", "Watching"],
    ["joinmember", "Member"],
    ["recentlyVisited", "Recently visited"],
  ] as const;
  for (const [paneId, label] of expectedTabs) {
    await page.locator("#usermenu-tab-content-list .nav-subtab button", { hasText: label }).click();
    await expect(
      page.locator("#usermenu-tab-content-list .nav-subtab li", { hasText: label }),
    ).toHaveClass(/active/);
    await expect(page.locator(`#${paneId}`)).toHaveClass(/active/);
    expect(page.url()).toBe(projectTabUrl);
    await expect(projectSearch).toHaveValue("sample");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
        ),
      )
      .toBe("home-project-subtabs");
  }

  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __projectPaneSpaSentinel?: string }
    ).__projectPaneSpaSentinel = "alive";
  });
  await sampleRow
    .locator(':scope > .project-list > .project-item > a[href$="/admin/sample"]')
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin/sample`);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectPaneSpaSentinel?: string })
          .__projectPaneSpaSentinel,
    ),
  ).toBe("alive");

  await page.goto(`${basePath}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await page.locator(".myProjectList button").click();
  await page.evaluate(() => {
    (
      window as Window & typeof globalThis & { __projectPaneOwnerSpaSentinel?: string }
    ).__projectPaneOwnerSpaSentinel = "alive";
  });
  await page
    .locator("#myProjectList #recentlyVisited > .user-li")
    .getByRole("link", { name: "admin", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/admin`);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectPaneOwnerSpaSentinel?: string })
          .__projectPaneOwnerSpaSentinel,
    ),
  ).toBe("alive");
});

test("authenticated root sidebar recent issue tab matches legacy index/myRecentIssueList DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedEmptyNotifications(page);
  await mockWorkspaceSidebarProjects(page);

  await page.goto(`${basePath}/`);
  await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
  await expect(page.locator("#mySidenav")).toHaveClass(/sidenav-open/);
  await page.locator(".myRecentIssueList button").click();
  await expect(page.locator("#usermenu-tab-content-list #recentlyVisitedIssues")).toBeVisible();
  await expect(page.locator("#myRecentIssueList .user-li")).toHaveCount(2);
  await expect(page.locator("#usermenu-tab-content-list [data-toggle='popover']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-trigger='hover']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-placement='right']")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list [data-content]")).toHaveCount(0);
  await expect(page.locator("#usermenu-tab-content-list .popover.right")).toHaveCount(0);

  await expect(
    page.locator("#usermenu-tab-content-list > .user-project-list.active"),
  ).toHaveAttribute("id", "myRecentIssueList");
  expect(await canonicalizeSelector(page, "#myRecentIssueList")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SIDEBAR_RECENT_ISSUE_TAB.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readSidebarRecentIssueTabMetrics(page)).toEqual({
    activePaneDisplay: "block",
    issueCount: 2,
    issueRowDisplay: "flex",
    issueRowHeight: 27,
    issueTitleColor: "rgb(0, 0, 0)",
    issueTitleDisplay: "inline-block",
    issueTitleStartWidth: 10,
    rootWidth: 350,
    searchHeight: 42,
    searchPadding: "4px 6px",
  });

  const issueRow = page.locator(
    "#myRecentIssueList .user-li:has(a[href$='/admin/sample/issue/42']) > .project-list",
  );
  await expect(issueRow).not.toHaveAttribute("data-toggle");
  await expect(issueRow).not.toHaveAttribute("data-trigger");
  await expect(issueRow).not.toHaveAttribute("data-placement");
  await expect(issueRow).not.toHaveAttribute("data-content");
  await assertSidebarRightPopover(page, issueRow, "sample #42");
});

test("direct notifications route matches legacy Application.notifications empty state DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const setDefaultLoginPageRequests: string[] = [];
  await mockAuthenticatedEmptyNotifications(page);
  await page.route("**/user/defultLoginPage?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    setDefaultLoginPageRequests.push(`${requestUrl.pathname}${requestUrl.search}`);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ defaultLoginPage: requestUrl.searchParams.get("path") ?? "" }),
    });
  });

  await page.goto(`${basePath}/notifications`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Yoram");
  await expect
    .poll(() =>
      page
        .locator("head > title")
        .evaluateAll((titles) => titles.map((title) => title.textContent ?? "")),
    )
    .toContain("Yoram");
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-page-wrap-outer"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-notification-list"]'),
  ).toBeVisible();
  const emptyNotification = page.locator(
    "ul.activity-streams.notification-wrap.unstyled > div.warning-none",
  );
  await expect(emptyNotification).toHaveCount(1);
  await expect(emptyNotification).toHaveAttribute(
    "data-stylex-owner",
    "authenticated-home-notification-empty",
  );
  await expect(emptyNotification.locator(":scope > i.yobicon-danger")).toHaveCount(1);
  await expect(emptyNotification).toHaveText("No notification has been received.");
  await expect(emptyNotification.locator(":scope > *")).toHaveCount(1);
  expect(await emptyNotification.evaluate((element) => element.innerHTML)).toBe(
    '<i class="yobicon-danger"></i> No notification has been received.',
  );
  for (const attribute of [
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-dismiss",
    "data-target",
    "data-trigger",
    "data-backdrop",
    "data-spy",
    "data-provider",
    "data-loading-text",
  ]) {
    await expect(emptyNotification).not.toHaveAttribute(attribute);
  }
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
  const defaultLandingButton = page.locator("#setDefaultLoginPage");
  await expect(defaultLandingButton).toHaveText("Set to default page");
  await expect(defaultLandingButton).toHaveAttribute(
    "data-stylex-owner",
    "authenticated-home-default-login-action",
  );
  await expect(defaultLandingButton).not.toHaveClass(/(?:^|\s)(?:ybtn|hide-in-mobile)(?:\s|$)/u);
  await expect(defaultLandingButton).toHaveAttribute("type", "button");
  await expect(defaultLandingButton).not.toHaveAttribute("data-url");
  await expect(defaultLandingButton).toHaveAttribute("title", "Set to default page");
  await expect(defaultLandingButton).not.toHaveAttribute("data-trigger");
  await expect(defaultLandingButton).not.toHaveAttribute("data-placement");
  await expect(defaultLandingButton).not.toHaveAttribute("data-toggle");
  await expect(defaultLandingButton).not.toHaveAttribute("data-content");
  await expect(
    page.locator('[data-stylex-owner="authenticated-home-series-tabs"] .popover'),
  ).toHaveCount(0);

  await defaultLandingButton.hover();
  const defaultLandingPopover = page.locator(
    '[data-stylex-owner="authenticated-home-default-login-popover"]',
  );
  await expect(defaultLandingPopover).toBeVisible();
  await expect(defaultLandingPopover).not.toHaveClass(/(?:^|\s)(?:popover|bottom)(?:\s|$)/u);
  await expect(
    defaultLandingPopover.locator(
      '[data-stylex-owner="authenticated-home-default-login-popover-title"]',
    ),
  ).toHaveText("Set to default page");
  await expect(
    defaultLandingPopover.locator(
      '[data-stylex-owner="authenticated-home-default-login-popover-content"]',
    ),
  ).toHaveText("Make current page the index page when logged in");
  const popoverBoxes = await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>("#setDefaultLoginPage");
    const popover = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-default-login-popover"]',
    );
    if (!button || !popover) return null;
    const buttonBox = button.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    return {
      buttonBottom: buttonBox.bottom,
      buttonCenter: buttonBox.left + buttonBox.width / 2,
      popoverCenter: popoverBox.left + popoverBox.width / 2,
      popoverTop: popoverBox.top,
    };
  });
  expect(popoverBoxes).not.toBeNull();
  expect(popoverBoxes!.popoverTop).toBeGreaterThanOrEqual(popoverBoxes!.buttonBottom);
  expect(Math.abs(popoverBoxes!.popoverCenter - popoverBoxes!.buttonCenter)).toBeLessThanOrEqual(4);
  await page.mouse.move(1, 1);
  await expect(defaultLandingPopover).toHaveCount(0);
  await defaultLandingButton.focus();
  await expect(defaultLandingPopover).toBeVisible();
  await expect(
    defaultLandingPopover.locator(
      '[data-stylex-owner="authenticated-home-default-login-popover-title"]',
    ),
  ).toHaveText("Set to default page");
  await defaultLandingButton.evaluate((button) => button.blur());
  await expect(defaultLandingPopover).toHaveCount(0);

  await defaultLandingButton.click();
  await expect(defaultLandingButton).toBeHidden();
  await expect(defaultLandingPopover).toHaveCount(0);
  expect(setDefaultLoginPageRequests).toEqual([
    `${basePath}/user/defultLoginPage?path=%2Fnotifications`,
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readMobileAuthenticatedHomeMetrics(page)).toEqual({
    defaultLandingButtonDisplay: "none",
    mainStreamWidth: 390,
    pageWrapOuterWidth: 390,
    siteGuideOuterMargin: "40px 0px 0px",
  });

  const mainStreamTabs = page.locator(
    '[data-stylex-owner="authenticated-home-main-stream"] > [data-stylex-owner="authenticated-home-series-tabs"]',
  );
  await expect(mainStreamTabs).not.toHaveClass(/(?:^|\s)(?:nav|nav-tabs)(?:\s|$)/u);
  await expect(mainStreamTabs.locator("> li").nth(0)).not.toHaveClass(/active/u);
  await expect(mainStreamTabs.locator("> li").nth(1)).not.toHaveClass(/active/u);
  await expect(mainStreamTabs.locator("> li").nth(2)).not.toHaveClass(/active/u);
  await expect(mainStreamTabs.locator("> li > a")).toHaveText([
    "Notification",
    "My Issues",
    "My Files",
  ]);
  await expect(mainStreamTabs.locator("> li > a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/notifications`,
  );
  await expect(mainStreamTabs.locator("> li > a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/user/issues`,
  );
  await expect(mainStreamTabs.locator("> li > a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/user/files`,
  );
  await expect(mainStreamTabs.locator("> li > a.active")).toHaveCount(0);
  for (const tabLink of await mainStreamTabs.locator("> li > a").all()) {
    await expect(tabLink).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-home-series-tab-link",
    );
    await expect(tabLink).not.toHaveAttribute("title");
    await expect(tabLink).not.toHaveAttribute("aria-current");
    await expect(tabLink).not.toHaveAttribute("data-status");
  }

  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const mainStreamTabSource = routeSource.slice(
    routeSource.lastIndexOf(
      "<div",
      routeSource.indexOf('data-stylex-owner="authenticated-home-main-stream"'),
    ),
    routeSource.lastIndexOf(
      "<ul",
      routeSource.indexOf('data-stylex-owner="authenticated-home-notification-list"'),
    ),
  );
  const setDefaultButtonSource = routeSource.slice(
    routeSource.indexOf('id="setDefaultLoginPage"'),
    routeSource.indexOf(
      "{defaultLandingButtonTitle}",
      routeSource.indexOf('id="setDefaultLoginPage"'),
    ),
  );
  expect(mainStreamTabSource).not.toContain("LegacyInternalLink");
  expect(mainStreamTabSource).not.toContain("activeProps={{ className: undefined }}");
  expect(mainStreamTabSource).toContain('to="/notifications"');
  expect(mainStreamTabSource).toContain('to="/user/issues"');
  expect(mainStreamTabSource).toContain('to="/user/files"');
  expect(mainStreamTabSource).toContain("LEGACY_HOME_STREAM_LINK_SUPPRESSION_PROPS");
  expect(mainStreamTabSource).not.toContain("data-url=");
  expect(mainStreamTabSource).not.toContain("data-url");
  expect(setDefaultButtonSource).not.toContain("data-trigger");
  expect(setDefaultButtonSource).not.toContain("data-placement");
  expect(setDefaultButtonSource).not.toContain("data-toggle");
  expect(setDefaultButtonSource).not.toContain("data-content");
  expect(mainStreamTabSource).toContain(
    'data-stylex-owner="authenticated-home-default-login-popover"',
  );
  expect(mainStreamTabSource).toContain("onMouseEnter={showDefaultLandingPopover}");
  expect(mainStreamTabSource).toContain("onFocus={showDefaultLandingPopover}");

  const myIssuesTab = mainStreamTabs.locator('a:has-text("My Issues")');
  await expect(myIssuesTab).toHaveAttribute("href", `${basePath}/user/issues`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "notifications-my-issues-tab";
  });
  await myIssuesTab.click();
  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&query=&state=open`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("notifications-my-issues-tab");

  await mockWorkspaceFiles(page);
  await page.goto(`${basePath}/notifications`);
  const myFilesTab = page.locator(
    '[data-stylex-owner="authenticated-home-series-tabs"] a:has-text("My Files")',
  );
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "notifications-my-files-tab";
  });
  await myFilesTab.click();
  await expect(page).toHaveURL(`${basePath}/user/files?filter=&pageNum=1`);
  await expect(page.locator(".attachment-files")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("notifications-my-files-tab");
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
  await expect(page.locator(NOTIFICATION_ROW)).toHaveCount(1);
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
  const notificationTitle = page.locator(`${NOTIFICATION_TITLE} a`);
  const notificationAvatar = page.locator(`${NOTIFICATION_META} .avatar-wrap`);
  const notificationAuthor = page.locator(NOTIFICATION_AUTHOR);
  await expect(notificationTitle).toHaveText("Issue #1 updated");
  await expect(notificationTitle).toHaveAttribute("href", `${basePath}/admin/sample/issue/1`);
  await expect(notificationTitle).not.toHaveAttribute("class");
  await expect(notificationTitle).not.toHaveAttribute("title");
  await expect(notificationTitle).not.toHaveAttribute("aria-current");
  await expect(notificationTitle).not.toHaveAttribute("data-status");
  await expect(notificationAvatar).toHaveAttribute("href", `${basePath}/admin`);
  await expect(notificationAvatar).toHaveClass(/\bavatar-wrap\b/u);
  await expect(notificationAvatar).toHaveClass(/\bsmaller\b/u);
  await expect(notificationAuthor).toHaveText("Site Admin");
  await expect(notificationAuthor).toHaveAttribute("href", `${basePath}/admin`);
  await expect(notificationAuthor).not.toHaveClass(/\bauthor\b/u);
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

test("authenticated home renders notification newlines as escaped React nodes", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedNotifications(page, [
    {
      actor: {
        avatarUrl: "/assets/images/default-avatar-128.png",
        displayName: "Alice Kim",
        loginId: "alice",
      },
      createdAt: "2026-07-07T11:25:34Z",
      createdLabel: "4 days ago",
      eventType: "NEW_COMMENT",
      id: "5",
      message:
        "Board seed confirmed.\nFirst\r\nSecond\n--- Original posting ---<script>safe</script>",
      targetHref: "/admin/sample/post/1#comment-1",
      targetTitle: "Re: [sample] Seed notes (1)",
      typeIcon: "comment2",
    },
  ]);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);
  const message = page.locator(NOTIFICATION_MESSAGE);
  await expect(message.locator("br")).toHaveCount(3);
  expect(
    await message.evaluate((element) =>
      [...element.childNodes].map((node) =>
        node.nodeType === Node.TEXT_NODE ? node.textContent : node.nodeName,
      ),
    ),
  ).toEqual([
    "Board seed confirmed.",
    "BR",
    "First",
    "BR",
    "Second",
    "BR",
    "--- Original posting ---<script>safe</script>",
  ]);
  await expect(message.locator("script")).toHaveCount(0);
  const desktop = await readDesktopNotificationStreamMetrics(page);
  expect(desktop.messageLineHeight).toBe("20px");
  expect(desktop.metaMarginTop).toBe("5px");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await readMobileNotificationStreamMetrics(page);
  expect(mobile.messageLineHeight).toBe("20px");
  expect(mobile.metaFontSize).toBe("12px");
});

test("direct notifications route keeps React-owned learn-more behavior without legacy JS hooks", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    (
      window as Window &
        typeof globalThis & {
          __streamDescClickListenerTargets?: string[];
        }
    ).__streamDescClickListenerTargets = [];
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        type === "click" &&
        this instanceof Element &&
        this.matches('[data-stylex-owner="authenticated-home-notification-desc"]')
      ) {
        (
          window as Window &
            typeof globalThis & {
              __streamDescClickListenerTargets: string[];
            }
        ).__streamDescClickListenerTargets.push(this.id || this.className);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
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
  await expect(page.locator(NOTIFICATION_ROW)).toHaveCount(1);
  const beforeUrl = page.url();
  const streamDesc = page.locator(NOTIFICATION_DESC);
  const messageWrap = page.locator("#message-42");

  await expect(streamDesc).not.toHaveAttribute("data-target");
  await expect(streamDesc).not.toHaveAttribute("data-toggle");
  await expect(streamDesc).not.toHaveAttribute("role");
  await expect(streamDesc).not.toHaveAttribute("tabindex");
  await expect(messageWrap).toHaveCSS("max-height", "200px");
  await expect(messageWrap).not.toHaveAttribute("style", /min-height/u);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window &
              typeof globalThis & {
                __streamDescClickListenerTargets?: string[];
              }
          ).__streamDescClickListenerTargets ?? [],
      ),
    )
    .toEqual([]);
  await page.locator(`${NOTIFICATION_TITLE} a`).evaluate((anchor) => {
    anchor.addEventListener("click", (event) => event.preventDefault(), { once: true });
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await expect(messageWrap).toHaveCSS("max-height", "200px");
  await page.locator(`${NOTIFICATION_META} .avatar-wrap img`).evaluate((image) => {
    image.closest("a")?.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    image.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await expect(messageWrap).toHaveCSS("max-height", "200px");

  await page.locator(NOTIFICATION_MESSAGE).click();
  await expect(messageWrap).toHaveCSS("max-height", "none");
  await expect
    .poll(() => messageWrap.evaluate((element) => element.style.minHeight))
    .toMatch(/px$/u);
  await page.locator(NOTIFICATION_MESSAGE).click();
  await expect(messageWrap).toHaveCSS("max-height", "200px");
  await expect.poll(() => messageWrap.evaluate((element) => element.style.minHeight)).toBe("");
  expect(page.url()).toBe(beforeUrl);

  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const notificationStreamItemSource = routeSource.slice(
    routeSource.indexOf("function NotificationStreamItem"),
    routeSource.indexOf("export function SiteLayoutShell"),
  );
  expect(notificationStreamItemSource).not.toContain("data-target");
  expect(notificationStreamItemSource).not.toContain("data-toggle");
  expect(notificationStreamItemSource).not.toContain("addEventListener");
  expect(notificationStreamItemSource).not.toContain("removeEventListener");
  expect(notificationStreamItemSource).not.toContain("document.getElementById");
  expect(notificationStreamItemSource).not.toContain("classList");
  expect(notificationStreamItemSource).not.toContain("style.minHeight");
  expect(notificationStreamItemSource).not.toContain('role="button"');
  expect(notificationStreamItemSource).not.toContain("tabIndex=");
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
  await expect(page.locator(NOTIFICATION_ROW)).toHaveCount(1);
  const more = page.locator(NOTIFICATION_MORE);
  const messageWrap = page.locator("#message-42");

  await expect(more).toHaveText("...");
  await expect(more).toBeVisible();
  await page.locator(NOTIFICATION_MESSAGE).click();
  await expect(messageWrap).toHaveCSS("max-height", "none");
  await expect(more).toBeHidden();
  await page.locator(NOTIFICATION_MESSAGE).click();
  await expect(messageWrap).toHaveCSS("max-height", "200px");
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
  await expect(page.locator(NOTIFICATION_ROW)).toHaveCount(20);
  const notificationMore = page.locator(
    '[data-stylex-owner="authenticated-home-notification-pagination"]',
  );
  await expect(notificationMore).toBeVisible();
  await expect(notificationMore).toHaveText("More");
  await expect(notificationMore).toHaveCSS("box-sizing", "content-box");
  await expect(notificationMore).not.toHaveAttribute("style");
  await expect(page.locator("a[href^='javascript:']#notification-more")).toHaveCount(0);
  const desktopMore = await readNotificationMoreGeometry(page);
  expect(desktopMore.buttonLeft).toBeCloseTo(desktopMore.parentLeft, 1);
  expect(desktopMore.buttonWidth).toBeCloseTo(
    desktopMore.contentWidth + desktopMore.horizontalChrome,
    1,
  );
  expect(desktopMore.buttonRight).toBeCloseTo(
    desktopMore.buttonLeft + desktopMore.contentWidth + desktopMore.horizontalChrome,
    1,
  );
  expect(desktopMore.horizontalChrome).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMore = await readNotificationMoreGeometry(page);
  expect(mobileMore.buttonLeft).toBeCloseTo(mobileMore.parentLeft, 1);
  expect(mobileMore.buttonWidth).toBeCloseTo(
    mobileMore.contentWidth + mobileMore.horizontalChrome,
    1,
  );
  expect(mobileMore.buttonRight).toBeCloseTo(
    mobileMore.buttonLeft + mobileMore.contentWidth + mobileMore.horizontalChrome,
    1,
  );
  expect(mobileMore.horizontalChrome).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1366, height: 900 });
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_DIRECT_NOTIFICATIONS.replace(
        `<div class="warning-none"><i class="yobicon-danger"></i> No notification has been received.</div>`,
        `${expectedNotificationRows(firstPageItems, basePath)}<li><button id="notification-more" type="button">More</button></li>`,
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const beforeUrl = page.url();
  await notificationMore.click();
  await expect(page.locator(NOTIFICATION_ROW)).toHaveCount(21);
  await expect(page.locator(NOTIFICATION_ROW, { hasText: "Issue #21 updated" })).toHaveCount(1);
  await expect(page.locator("#notification-more")).toHaveCount(0);
  await expect(page.locator("button[type='button'].ybtn#notification-more")).toHaveCount(0);
  expect(page.url()).toBe(beforeUrl);
  expect(requests).toContain(`${basePath}/api/v1/notifications?from=20&size=20`);
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_DIRECT_NOTIFICATIONS.replace(
        `<div class="warning-none"><i class="yobicon-danger"></i> No notification has been received.</div>`,
        expectedNotificationRows([...firstPageItems, nextPageItem], basePath),
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("authenticated home notification-more keeps legacy content-box geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const item = createMockNotification("1", "Issue #1 updated");
  await mockAuthenticatedNotificationsByPage(page, (url) =>
    url.searchParams.get("from") === "1"
      ? { hasMore: false, items: [], total: 1 }
      : { hasMore: true, items: [item], total: 1 },
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);
  const more = page.locator("#notification-more");
  await expect(more).toHaveCSS("box-sizing", "content-box");
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await readNotificationMoreGeometry(page);
    expect(geometry.buttonLeft).toBeCloseTo(geometry.parentLeft, 1);
    expect(geometry.buttonWidth).toBeCloseTo(geometry.contentWidth + geometry.horizontalChrome, 1);
    expect(geometry.buttonRight).toBeCloseTo(
      geometry.buttonLeft + geometry.contentWidth + geometry.horizontalChrome,
      1,
    );
  }
  await more.click();
  await expect(more).toHaveCount(0);
});

async function readNotificationMoreGeometry(page: Page) {
  return page.locator("#notification-more").evaluate((button) => {
    const parent = button.parentElement;
    const list = button.closest('[data-stylex-owner="authenticated-home-notification-list"]');
    if (!parent || !list) throw new Error("notification-more container is missing");
    const buttonBox = button.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    const style = getComputedStyle(button);
    const horizontalChrome =
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    return {
      buttonLeft: buttonBox.left,
      buttonRight: buttonBox.right,
      buttonWidth: buttonBox.width,
      contentWidth: Number.parseFloat(style.width),
      horizontalChrome,
      listRight: listBox.right,
      listWidth: listBox.width,
      parentLeft: parentBox.left,
      parentRight: parentBox.right,
      parentWidth: parentBox.width,
    };
  });
}

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
    <div class="stream-desc">
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
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-brand-link"]');
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-page-wrap-outer"]',
    );
    const mainStream = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-main-stream"]',
    );
    const activityStreams = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-list"]',
    );
    const guideToggleButton = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-intro-guide-toggle"] button',
    );
    const navLink = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-series-tabs"] > li > a',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>(
      "[data-stylex-owner=site-footer-provider]",
    );
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
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-page-wrap-outer"]',
    );
    const siteGuideOuter = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-intro-guide"]',
    );
    const mainStream = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-main-stream"]',
    );
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

async function readDesktopClosedLeftSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('[data-stylex-owner="framed-site-main"]');
    const pin = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-sidebar-open-pin"]',
    );
    if (!main || !pin) {
      throw new Error("Expected closed legacy framed sidebar metric targets are missing.");
    }

    const mainBox = main.getBoundingClientRect();
    const pinBox = pin.getBoundingClientRect();
    return {
      mainWidth: Math.round(mainBox.width),
      mainX: Math.round(mainBox.x),
      pinHeight: Math.round(pinBox.height),
      pinWidth: Math.round(pinBox.width),
      pinX: Math.round(pinBox.x),
      pinY: Math.round(pinBox.y),
    };
  });
}

async function readDesktopOpenLeftSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>("#sidebar");
    const main = document.querySelector<HTMLElement>('[data-stylex-owner="framed-site-main"]');
    const pin = document.querySelector<HTMLElement>(
      '#sidebar [data-stylex-owner="left-sidebar-close-pin"]',
    );
    const leftAvatar = document.querySelector<HTMLImageElement>(
      '#sidebar [data-stylex-owner="left-sidebar-profile-identity"] img',
    );
    const rightAvatar = document.querySelector<HTMLImageElement>(".gnb-usermenu .avatar-wrap img");
    if (!sidebar || !main || !pin || !leftAvatar || !rightAvatar) {
      throw new Error("Expected open legacy framed sidebar metric targets are missing.");
    }

    const sidebarBox = sidebar.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    const pinBox = pin.getBoundingClientRect();
    return {
      leftAvatarNaturalWidth: leftAvatar.naturalWidth,
      mainBackground: getComputedStyle(main).backgroundColor,
      mainHeight: Math.round(mainBox.height),
      mainWidth: Math.round(mainBox.width),
      mainX: Math.round(mainBox.x),
      pinHeight: Math.round(pinBox.height),
      pinWidth: Math.round(pinBox.width),
      pinX: Math.round(pinBox.x),
      pinY: Math.round(pinBox.y),
      rightAvatarNaturalWidth: rightAvatar.naturalWidth,
      sidebarHeight: Math.round(sidebarBox.height),
      sidebarWidth: Math.round(sidebarBox.width),
      sidebarX: Math.round(sidebarBox.x),
      sidebarY: Math.round(sidebarBox.y),
    };
  });
}

async function readMobileOpenLeftSidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>("#sidebar");
    const main = document.querySelector<HTMLElement>('[data-stylex-owner="framed-site-main"]');
    const leftAvatar = document.querySelector<HTMLImageElement>(
      '#sidebar [data-stylex-owner="left-sidebar-profile-identity"] img',
    );
    const rightAvatar = document.querySelector<HTMLImageElement>(".gnb-usermenu .avatar-wrap img");
    if (!sidebar || !main || !leftAvatar || !rightAvatar) {
      throw new Error("Expected mobile legacy framed sidebar metric targets are missing.");
    }

    const sidebarBox = sidebar.getBoundingClientRect();
    const mainBox = main.getBoundingClientRect();
    return {
      leftAvatarNaturalWidth: leftAvatar.naturalWidth,
      mainBackground: getComputedStyle(main).backgroundColor,
      mainHeight: Math.round(mainBox.height),
      mainWidth: Math.round(mainBox.width),
      mainX: Math.round(mainBox.x),
      rightAvatarNaturalWidth: rightAvatar.naturalWidth,
      sidebarHeight: Math.round(sidebarBox.height),
      sidebarPosition: getComputedStyle(sidebar).position,
      sidebarWidth: Math.round(sidebarBox.width),
      sidebarX: Math.round(sidebarBox.x),
      sidebarY: Math.round(sidebarBox.y),
    };
  });
}

async function readLeftSidebarTabMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(
      '#sidebar > [data-stylex-owner="left-sidebar-tabs"]',
    );
    const content = document.querySelector<HTMLElement>(
      '#sidebar > [data-stylex-owner="left-sidebar-tab-panel"]',
    );
    const search = document.querySelector<HTMLElement>(
      '[data-stylex-owner="left-sidebar-favorite-shell"] input',
    );
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>(
        '#sidebar > [data-stylex-owner="left-sidebar-tabs"] > li',
      ),
    );
    const buttons = tabs.map((tab) => tab.querySelector<HTMLButtonElement>(":scope > button"));
    const refresh = buttons.at(-1);
    if (
      !nav ||
      !content ||
      !search ||
      tabs.length !== 4 ||
      buttons.some((button) => !button) ||
      !refresh
    ) {
      throw new Error("Expected legacy framed sidebar tab targets are missing.");
    }

    const refreshBox = refresh.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    return {
      contentTop: Math.round(content.getBoundingClientRect().top),
      firstThreeFontWeights: buttons
        .slice(0, 3)
        .map((button) => getComputedStyle(button!).fontWeight),
      navHeight: Math.round(nav.getBoundingClientRect().height),
      refreshHeight: Math.round(refreshBox.height),
      refreshPadding: getComputedStyle(refresh).padding,
      refreshWidth: Math.round(refreshBox.width),
      searchHeight: Math.round(searchBox.height),
      searchTop: Math.round(searchBox.top),
      tabTops: tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)),
      tabWidths: tabs.map((tab) => Math.round(tab.getBoundingClientRect().width)),
    };
  });
}

async function duplicateSidebarIds(page: Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector("#sidebar");
    const userMenu = document.querySelector("#mySidenav");
    if (!sidebar || !userMenu) {
      throw new Error("Expected left and right sidebar roots are missing.");
    }
    return Array.from(document.querySelectorAll<HTMLElement>("#sidebar [id], #mySidenav [id]"))
      .map((element) => element.id)
      .filter((id) => document.querySelectorAll(`[id=${JSON.stringify(id)}]`).length !== 1);
  });
}

async function readSidebarFavoriteTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#myOrganizationList");
    const search = root?.querySelector<HTMLElement>(".org-search");
    const organization = root?.querySelector<HTMLElement>(".org-li");
    const organizationRow = root?.querySelector<HTMLElement>(".org-list");
    const project = document.querySelector<HTMLElement>(
      "#myOrganizationList .user-li:has(a[href$='/admin/sample'])",
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

async function readFavoriteProjectNavigationGeometry(row: Locator) {
  return row.evaluate((currentRow) => {
    const root = currentRow.closest<HTMLElement>("#myOrganizationList");
    const menu = currentRow
      .closest<HTMLElement>("#mySidenav")
      ?.querySelector<HTMLElement>(".right-menu");
    const projectLink = currentRow.querySelector<HTMLElement>('a[href$="/external/member"]');
    const logo = projectLink?.querySelector<HTMLElement>(".site-logo");
    const name = projectLink?.querySelector<HTMLElement>(".project-name");
    const owner = currentRow.querySelector<HTMLElement>(".project-owner a");
    const star = currentRow.querySelector<HTMLElement>("button.star-project");
    const list = currentRow.querySelector<HTMLElement>(".project-list");
    if (!root || !menu || !projectLink || !logo || !name || !owner || !star || !list) {
      throw new Error("Expected direct Favorite project navigation geometry targets.");
    }
    const logoBox = logo.getBoundingClientRect();
    const nameBox = name.getBoundingClientRect();
    const ownerBox = owner.getBoundingClientRect();
    const starBox = star.getBoundingClientRect();
    const rowBox = list.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    return {
      clientWidth: menu.clientWidth,
      logoLeft: logoBox.left,
      logoRight: logoBox.right,
      nameLeft: nameBox.left,
      nameRight: nameBox.right,
      ownerLeft: ownerBox.left,
      ownerRight: ownerBox.right,
      rootLeft: rootBox.left,
      rootRight: rootBox.right,
      rowLeft: rowBox.left,
      rowRight: rowBox.right,
      scrollWidth: menu.scrollWidth,
      starLeft: starBox.left,
      starRight: starBox.right,
    };
  });
}

async function assertSidebarRightPopover(page: Page, target: Locator, expectedContent: string) {
  const popover = page.locator(
    '#usermenu-tab-content-list [data-stylex-owner="authenticated-sidenav-recent-issue-popover"]',
  );
  await expect(popover).toHaveCount(0);

  await target.hover();
  await expect(popover).toBeVisible();
  await expect(popover).not.toHaveClass(/(?:^|\s)(?:popover|right)(?:\s|$)/);
  await expect(popover.locator(":scope > div").nth(1)).toHaveText(expectedContent);
  const metrics = await readSidebarRightPopoverMetrics(page);
  expect(metrics.arrowDisplay).toBe("block");
  expect(metrics.content).toBe(expectedContent);
  expect(metrics.isRightOfTarget).toBe(true);
  expect(metrics.verticalCenterDelta).toBeLessThanOrEqual(1);

  await page.mouse.move(1, 1);
  await expect(popover).toHaveCount(0);
}

async function readSidebarRightPopoverMetrics(page: Page) {
  return page.evaluate(() => {
    const target = document.querySelector<HTMLElement>(
      '#usermenu-tab-content-list .project-list:has([data-stylex-owner="authenticated-sidenav-recent-issue-popover"])',
    );
    const popover = target?.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-sidenav-recent-issue-popover"]',
    );
    const arrow = popover?.children.item(0) as HTMLElement | null;
    const content = popover?.children.item(1) as HTMLElement | null;
    if (!target || !popover || !arrow || !content) {
      throw new Error("Expected sidebar right popover metric targets are missing.");
    }

    const targetBox = target.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    return {
      arrowDisplay: getComputedStyle(arrow).display,
      content: content.textContent ?? "",
      isRightOfTarget: popoverBox.left >= targetBox.right,
      verticalCenterDelta: Math.round(
        Math.abs(targetBox.top + targetBox.height / 2 - (popoverBox.top + popoverBox.height / 2)),
      ),
    };
  });
}

async function readSidebarProjectTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#myProjectList");
    const search = root?.querySelector<HTMLElement>(".project-search");
    const subtab = root?.querySelector<HTMLElement>(".subtab-wrap");
    const activePane = root?.querySelector<HTMLElement>("#recentlyVisited");
    const project = activePane?.querySelector<HTMLElement>(".user-li");
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

async function readProjectPaneRowGeometry(page: Page, paneId: string) {
  return page.evaluate((id) => {
    const root = document.querySelector<HTMLElement>("#myProjectList");
    const row = root?.querySelector<HTMLElement>(`#${id} > .user-li > .project-list`);
    const logo = row?.querySelector<HTMLElement>(".site-logo");
    const name = row?.querySelector<HTMLElement>(".project-name");
    const owner = row?.querySelector<HTMLElement>(".project-owner");
    const star = row?.querySelector<HTMLElement>("button.star-project");
    if (!root || !row || !logo || !name || !owner || !star) {
      throw new Error(`Expected project pane row geometry targets are missing for ${id}.`);
    }
    const rootBox = root.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const logoBox = logo.getBoundingClientRect();
    const nameBox = name.getBoundingClientRect();
    const ownerBox = owner.getBoundingClientRect();
    const starBox = star.getBoundingClientRect();
    return {
      clientWidth: row.clientWidth,
      logoRight: logoBox.right,
      nameLeft: nameBox.left,
      nameRight: nameBox.right,
      ownerLeft: ownerBox.left,
      ownerRight: ownerBox.right,
      rootLeft: rootBox.left,
      rootRight: rootBox.right,
      rowLeft: rowBox.left,
      rowRight: rowBox.right,
      scrollWidth: row.scrollWidth,
      starLeft: starBox.left,
    };
  }, paneId);
}

async function readSidebarRecentIssueTabMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#myRecentIssueList");
    const search = root?.querySelector<HTMLElement>(".project-search");
    const activePane = root?.querySelector<HTMLElement>("#recentlyVisitedIssues");
    const issue = activePane?.querySelector<HTMLElement>(".user-li");
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
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>('[data-stylex-owner="global-gnb-brand-link"]');
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-page-wrap-outer"]',
    );
    const mainStream = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-main-stream"]',
    );
    const activityStreams = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-list"]',
    );
    const warning = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-empty"]',
    );
    const guideToggleButton = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-intro-guide-toggle"] button',
    );
    const navLink = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-series-tabs"] > li > a',
    );
    const pageFooter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>(
      "[data-stylex-owner=site-footer-provider]",
    );
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
    const stream = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-row"]',
    );
    const streamType = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-type"]',
    );
    const streamDesc = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-desc"]',
    );
    const title = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-title"]',
    );
    const messageWrap = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-message-wrap"]',
    );
    const meta = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-meta"]',
    );
    const avatar = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-meta"] .avatar-wrap',
    );
    const ago = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-ago"]',
    );
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
    const stream = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-row"]',
    );
    const streamType = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-type"]',
    );
    const streamDesc = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-desc"]',
    );
    const title = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-title"]',
    );
    const messageWrap = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-message-wrap"]',
    );
    const meta = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-meta"]',
    );
    const avatar = document.querySelector<HTMLElement>(
      '[data-stylex-owner="authenticated-home-notification-meta"] .avatar-wrap',
    );
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

async function installAuthenticatedHomeDropdownBubbleAudit(page: Page) {
  await page.addInitScript(() => {
    const dropdownClicks: string[] = [];
    Object.defineProperty(window, "__yonaAuthenticatedHomeDropdownBubbleClicks", {
      configurable: true,
      value: dropdownClicks,
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (
        event.target.closest(
          '[data-stylex-owner="authenticated-site-user-menu"] > #sidebar-open-btn > button',
        )
      ) {
        dropdownClicks.push("sidebar-toggle");
        return;
      }
      if (
        event.target.closest(
          '[data-stylex-owner="authenticated-site-user-menu"] > li.gnb-usermenu-dropdown > button:not([title])',
        )
      ) {
        dropdownClicks.push("create-toggle");
      }
    });
  });
}

async function authenticatedHomeDropdownBubbleClicks(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __yonaAuthenticatedHomeDropdownBubbleClicks?: string[] }
      ).__yonaAuthenticatedHomeDropdownBubbleClicks ?? [],
  );
}

async function mockAuthenticatedEmptyNotifications(page: Page) {
  await mockAuthenticatedNotifications(page, []);
}

async function mockDeferredAuthenticatedDefaultLanding(page: Page, defaultLandingPath: string) {
  let release = () => {};
  let markRequested = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    markRequested = resolve;
  });
  let requestMarked = false;

  await page.route("**/api/v1/session", async (route) => {
    if (!requestMarked) {
      requestMarked = true;
      markRequested();
    }
    await gate;
    await route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath,
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    });
  });
  await page.route("**/api/v1/notifications?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    });
  });

  return { release, requested };
}

async function mockAnonymousSession(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      }),
    });
  });
}

async function mockWorkspaceSidebarProjects(page: Page) {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectLogoUrl = `${basePath}/legacy-assets/images/project_default_logo.png`;
  const state = { requestCount: 0 };
  await page.route("**/api/v1/workspace", async (route) => {
    state.requestCount += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [
              {
                isFavorited: false,
                logoUrl: "",
                overview: "Internal playground",
                ownerName: "weblabs",
                projectId: 8,
                projectName: "playground",
                projectScope: "PRIVATE",
              },
            ],
          },
        ],
        favoriteProjects: [
          {
            isFavorited: true,
            logoUrl: "",
            ownerName: "external",
            projectId: 9,
            projectName: "member",
            projectScope: "PUBLIC",
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
            isFavorited: true,
            logoUrl: "",
            ownerName: "external",
            projectId: 9,
            projectName: "member",
            projectScope: "PUBLIC",
          },
        ],
        profile: {
          avatarUrl: `${basePath}/legacy-assets/images/default-avatar-34.png`,
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
            isFavorited: true,
            logoUrl: projectLogoUrl,
            overview: "Sample project",
            ownerName: "admin",
            projectId: 7,
            projectName: "sample",
            projectScope: "PUBLIC",
          },
        ],
        recentProjects: [
          {
            isFavorited: true,
            logoUrl: projectLogoUrl,
            ownerName: "admin",
            projectId: 7,
            projectName: "sample",
            projectScope: "PUBLIC",
          },
        ],
        watchedProjects: [
          {
            isFavorited: false,
            logoUrl: "",
            ownerName: "weblabs",
            projectId: 8,
            projectName: "playground",
            projectScope: "PRIVATE",
          },
        ],
      }),
    });
  });
  return state;
}

async function mockWorkspaceSidebarFavoriteInteractions(page: Page) {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let releaseProjectFavorite = () => {};
  const projectFavoriteGate = new Promise<void>((resolve) => {
    releaseProjectFavorite = resolve;
  });
  const projectRequests: Array<{ csrfToken: string | undefined; path: string }> = [];
  const organizationRequests: Array<{ csrfToken: string | undefined; path: string }> = [];
  const project = (
    projectId: number,
    ownerName: string,
    projectName: string,
    options: { isFavorited?: boolean; overview?: string; projectScope?: string } = {},
  ) => ({
    isFavorited: options.isFavorited ?? false,
    logoUrl: "",
    overview: options.overview ?? "",
    ownerName,
    projectId,
    projectName,
    projectScope: options.projectScope ?? "PUBLIC",
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-sidebar-favorites" },
      json: { isAnonymous: false },
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/favorite", async (route) => {
    const url = new URL(route.request().url());
    projectRequests.push({
      csrfToken: route.request().headers()["x-csrf-token"],
      path: url.pathname,
    });
    if (url.pathname.endsWith("/owners/admin/projects/sample/favorite")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          error: { code: "forbidden", message: "project denied", status: 403 },
        },
        status: 403,
      });
      return;
    }
    await projectFavoriteGate;
    await route.fulfill({
      contentType: "application/json",
      json: { favorited: false, ownerName: "external", projectName: "shared" },
    });
  });
  await page.route("**/api/v1/organizations/*/favorite", async (route) => {
    const url = new URL(route.request().url());
    organizationRequests.push({
      csrfToken: route.request().headers()["x-csrf-token"],
      path: url.pathname,
    });
    if (url.pathname.endsWith("/organizations/platform/favorite")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          error: { code: "forbidden", message: "organization denied", status: 403 },
        },
        status: 403,
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: { favorited: false, organizationName: "weblabs" },
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    const ownProjects = [
      project(7, "admin", "sample", {
        isFavorited: true,
        overview: "Sample project",
      }),
      project(12, "admin", "alpha"),
    ];
    const organizationProject = project(8, "weblabs", "internal-wip", {
      overview: "Internal work",
      projectScope: "PRIVATE",
    });
    const favoriteOrganizationProject = project(13, "weblabs", "docs", {
      isFavorited: true,
    });
    const directFavorite = project(9, "external", "shared", {
      isFavorited: true,
      projectScope: "PRIVATE",
    });
    await route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: null,
            projects: [organizationProject, favoriteOrganizationProject],
          },
        ],
        favoriteProjects: [
          ownProjects[0],
          organizationProject,
          directFavorite,
          { ...directFavorite },
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
            projectName: "internal-wip",
            title: "Review onboarding copy",
          },
        ],
        memberProjects: [directFavorite],
        organizations: [
          {
            isFavorited: false,
            organizationId: 15,
            organizationName: "platform",
            projectCount: 1,
            projects: [project(14, "platform", "runtime")],
          },
        ],
        ownProjects,
        profile: {
          avatarUrl: `${basePath}/legacy-assets/images/default-avatar-34.png`,
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
        recentProjects: [ownProjects[0]],
        watchedProjects: [organizationProject],
      },
    });
  });

  return {
    organizationRequests,
    projectRequests,
    releaseProjectFavorite,
  };
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
            avatarUrl: "/avatars/admin.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Site Admin",
            emailAddress: "admin@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: true,
            lastStateModifiedAt: "",
            loginId: "admin",
            state: "ACTIVE",
          },
        ],
      }),
    });
  });
}

async function mockWorkspaceFiles(page: Page) {
  await page.route("**/api/v1/workspace/files?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        files: [],
        filter: "",
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
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

async function mockDirectIssueFormDestination(
  page: Page,
  options: {
    bodyMarkdown?: string;
    referCommentId?: string;
    selectedProject: {
      ownerName: string;
      projectName: string;
    };
  },
) {
  const { bodyMarkdown = "", referCommentId = "", selectedProject } = options;

  await page.route("**/api/v1/user/issues/new-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        bodyMarkdown,
        referCommentId,
        selectedProject,
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/container**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const match = path.match(/\/owners\/([^/]+)\/projects\/([^/]+)\/container$/u);
    const ownerName = match?.[1] ?? selectedProject.ownerName;
    const projectName = match?.[2] ?? selectedProject.projectName;

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(directIssueProjectContainer(ownerName, projectName)),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/*/*/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/milestones", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: [
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsHtml: "",
            contentsMarkdown: "",
            dueDateLabel: "",
            id: "5",
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "Sprint 1",
            viewerCanDelete: true,
            viewerCanUpdate: true,
          },
        ],
      }),
    });
  });
}

function directIssueProjectContainer(ownerName: string, projectName: string) {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: ownerName === "dev" ? 9 : 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: ownerName === "dev",
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
    ownerName,
    projectName,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        '.unsupported, .admin-logged-in-affix, [data-stylex-owner="site-admin-affix"], [data-stylex-owner=global-gnb-outer], [data-stylex-owner="authenticated-home-page-wrap-outer"], [data-stylex-owner=site-footer]',
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
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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
    function normalizeAttribute(current: Element, name: string): string {
      if (
        name === "class" &&
        (current.matches('[data-stylex-owner="global-gnb-inner"]') ||
          current.matches('[data-stylex-owner="global-gnb-outer"]') ||
          current.matches('[data-stylex-owner="site-footer"]') ||
          current.matches('[data-stylex-owner="site-footer-inner"]') ||
          current.matches('[data-stylex-owner="site-footer-provider"]') ||
          current.matches('[data-stylex-owner="authenticated-home-page-wrap-outer"]') ||
          current.matches('[data-stylex-owner="authenticated-home-page-wrap"]') ||
          current.matches('[data-stylex-owner="authenticated-home-intro-guide"]') ||
          current.matches('[data-stylex-owner="authenticated-home-intro-guide-cta"]') ||
          current.matches('[data-stylex-owner="authenticated-home-intro-guide-toggle"]') ||
          current.matches('[data-stylex-owner="authenticated-home-notification-pagination"]'))
      ) {
        return "";
      }
      if (name === "class") {
        const retiredTokensByOwner: Record<string, string[]> = {
          "authenticated-home-content-page": ["page", "on-fold-intro"],
          "authenticated-home-content-grid": ["row-fluid"],
          "authenticated-home-main-stream": ["span8"],
          "authenticated-home-series-tabs": ["nav", "nav-tabs"],
          "authenticated-home-series-tab-item": ["active"],
          "authenticated-home-notification-list": ["notification-wrap", "unstyled"],
          "authenticated-home-index-rail": ["span4", "index-menu", "right-menu", "span-hard-wrap"],
          "authenticated-home-notification-empty": ["warning-none"],
        };
        const retiredTokens = retiredTokensByOwner[current.getAttribute("data-stylex-owner") ?? ""];
        if (retiredTokens) {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/u)
            .filter(
              (token, index, values) =>
                token &&
                !retiredTokens.includes(token) &&
                !token.startsWith("x") &&
                !token.includes("-home-route-screen__") &&
                values.indexOf(token) === index,
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
      }
      if (
        name === "class" &&
        current.classList.contains("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        const originalValue = current.getAttribute(name) ?? "";
        current.setAttribute(
          name,
          originalValue
            .split(/\s+/u)
            .filter((token) => token !== "gnb-nav")
            .join(" "),
        );
        try {
          return normalizeAttribute(current, name);
        } finally {
          current.setAttribute(name, originalValue);
        }
      }
      if (name === "class") {
        if (current.getAttribute("data-stylex-owner") === "global-gnb-project-list-divider") {
          return 'class="divider"';
        }
        if (current.getAttribute("data-stylex-owner") === "global-gnb-project-list-link") {
          return 'class="show-progress-bar"';
        }
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .filter((value) => !value.startsWith("x") && !value.includes("-home-route-screen__"))
          .filter(
            (value) =>
              value !== "admin-logged-in-affix" &&
              !(value === "small-font" && current.parentElement?.matches(".admin-logged-in-affix")),
          )
          .filter(
            (value) =>
              !(
                (["row-fluid", "user-menu-wrap"].includes(value) &&
                  current.matches(
                    '.row-fluid.user-menu-wrap, [data-stylex-owner="authenticated-sidenav-account-actions"]',
                  )) ||
                (["user-menu", "logout", "label"].includes(value) &&
                  current.tagName.toLowerCase() === "span" &&
                  current.closest(
                    '.row-fluid.user-menu-wrap, [data-stylex-owner="authenticated-sidenav-account-actions"]',
                  ))
              ),
          )
          .filter(
            (value) =>
              !(
                current.matches('[data-stylex-owner="global-gnb-brand-link"]') && value === "active"
              ),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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
    function normalizeAttribute(current: Element, name: string) {
      if (name === "class") {
        const stylexOwner = current
          .closest("[data-stylex-owner]")
          ?.getAttribute("data-stylex-owner");
        const isFavoriteStylexOwned =
          current.closest("#myOrganizationList") !== null &&
          (current.matches("#myOrganizationList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-favorite-shell",
                "authenticated-sidenav-favorite-organization-rows",
                "authenticated-sidenav-favorite-project-rows",
                "authenticated-sidenav-favorite-stars",
                "authenticated-sidenav-direct-project-rows",
              ].includes(stylexOwner ?? "")));
        const isProjectTabStylexOwned =
          current.closest("#myProjectList") !== null &&
          (current.matches("#myProjectList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-project-shell",
                "authenticated-sidenav-project-subtabs",
                "authenticated-sidenav-project-organization-list",
                "authenticated-sidenav-direct-project-rows",
                "authenticated-sidenav-favorite-stars",
              ].includes(stylexOwner ?? "")));
        const isRecentTabStylexOwned =
          current.closest("#myRecentIssueList") !== null &&
          (current.matches("#myRecentIssueList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-recent-shell",
                "authenticated-sidenav-recent-issue-rows",
                "authenticated-sidenav-recent-issue-popover",
              ].includes(stylexOwner ?? "")));
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .filter(
            (value) =>
              (!isFavoriteStylexOwned && !isProjectTabStylexOwned && !isRecentTabStylexOwned) ||
              (!value.startsWith("x") && !value.includes("-home-route-screen__")),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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
      function normalizeAttribute(current: Element, name: string): string {
        const value = current.getAttribute(name) ?? "";
        const stylexOwner = current
          .closest("[data-stylex-owner]")
          ?.getAttribute("data-stylex-owner");
        const isFavoriteStylexOwned =
          current.closest("#myOrganizationList") !== null &&
          (current.matches("#myOrganizationList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-favorite-shell",
                "authenticated-sidenav-favorite-organization-rows",
                "authenticated-sidenav-favorite-project-rows",
                "authenticated-sidenav-favorite-stars",
                "authenticated-sidenav-direct-project-rows",
              ].includes(stylexOwner ?? "")));
        const isProjectTabStylexOwned =
          current.closest("#myProjectList") !== null &&
          (current.matches("#myProjectList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-project-shell",
                "authenticated-sidenav-project-subtabs",
                "authenticated-sidenav-project-organization-list",
                "authenticated-sidenav-direct-project-rows",
                "authenticated-sidenav-favorite-stars",
              ].includes(stylexOwner ?? "")));
        const isRecentTabStylexOwned =
          current.closest("#myRecentIssueList") !== null &&
          (current.matches("#myRecentIssueList") ||
            (stylexOwner !== null &&
              [
                "authenticated-sidenav-tab-panel",
                "authenticated-sidenav-recent-shell",
                "authenticated-sidenav-recent-issue-rows",
                "authenticated-sidenav-recent-issue-popover",
              ].includes(stylexOwner ?? "")));
        if (
          name === "class" &&
          (isFavoriteStylexOwned || isProjectTabStylexOwned || isRecentTabStylexOwned)
        ) {
          const className = value
            .split(/\s+/u)
            .filter(
              (token, index, values) =>
                token &&
                !token.startsWith("x") &&
                !token.includes("-home-route-screen__") &&
                values.indexOf(token) === index,
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        if (name === "class" && current.closest("li.notification-stream")) {
          const retiredNotificationTokens = new Set([
            "notification-stream",
            "stream-type",
            "updated",
            "closed",
            "changed",
            "rejected",
            "warning",
            "merged",
            "comment2",
            "info",
            "list-alt",
            "ellipsis-horizontal",
            "stream-desc",
            "stream-info",
            "title",
            "message-wrap",
            "nowrap",
            "message",
            "more",
            "meta",
            "author",
            "ago",
            "pull-right",
          ]);
          const className = value
            .split(/\s+/u)
            .filter((token) => token && !retiredNotificationTokens.has(token))
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        const isSiteLayoutHeader =
          name === "class" &&
          current.classList.contains("gnb-outer") &&
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
        const isAuthenticatedHomePageWrapOuter =
          name === "class" &&
          current.matches("div.page-wrap-outer") &&
          current.querySelector(":scope > div.page-wrap") !== null;
        const isAuthenticatedHomePageWrap =
          name === "class" &&
          current.matches("div.page-wrap-outer > div.page-wrap") &&
          current.querySelector(":scope > .site-guide-outer + .guide-toggle + .page") !== null;
        const isAuthenticatedHomeIntroGuide =
          name === "class" &&
          current.matches("div.site-guide-outer") &&
          current.querySelector(":scope > h3 + table.welcome-table") !== null;
        const isAuthenticatedHomeIntroGuideTable =
          name === "class" && current.matches("div.site-guide-outer > table.welcome-table");
        const isAuthenticatedHomeIntroGuideCta =
          name === "class" &&
          current.matches(
            "div.site-guide-outer > table.welcome-table td:first-child > a.ybtn.ybtn-success",
          ) &&
          ["/projectform", "/organizations/new", "/projects"].some((path) =>
            (current.getAttribute("href") ?? "").endsWith(path),
          );
        const isAuthenticatedHomeIntroGuideToggle =
          name === "class" &&
          current.matches("div.guide-toggle") &&
          current.querySelector(":scope > #toggleIntro") !== null;
        const isAuthenticatedHomeContentPage =
          name === "class" &&
          current.matches("div.page.on-fold-intro") &&
          current.querySelector(":scope > .row-fluid.content-container") !== null;
        const isAuthenticatedHomeContentGrid =
          name === "class" &&
          current.matches("div.row-fluid.content-container") &&
          current.querySelector(":scope > .span8.main-stream + .span4.index-menu") !== null;
        const isAuthenticatedHomeMainStream =
          name === "class" &&
          current.matches("div.span8.main-stream") &&
          current.querySelector(":scope > .nav-tabs + .activity-streams") !== null;
        const isAuthenticatedHomeSeriesTabs =
          name === "class" &&
          current.matches("ul.nav.nav-tabs") &&
          current.parentElement?.matches("div.main-stream") === true &&
          current.nextElementSibling?.matches(".activity-streams") === true;
        const isAuthenticatedHomeActiveSeriesTab =
          name === "class" &&
          current.matches("li.active:first-child") &&
          current.parentElement?.parentElement?.matches("div.main-stream") === true &&
          current.parentElement?.nextElementSibling?.matches(".activity-streams") === true;
        const isAuthenticatedHomeNotificationList =
          name === "class" &&
          current.matches("ul.activity-streams.notification-wrap.unstyled") &&
          current.parentElement?.matches("div.main-stream") === true;
        const isAuthenticatedHomeNotificationEmpty =
          name === "class" &&
          current.matches("div.warning-none") &&
          current.parentElement?.matches("ul.activity-streams.notification-wrap.unstyled") === true;
        const isAuthenticatedHomeIndexRail =
          name === "class" &&
          current.matches("div.span4.index-menu.right-menu.span-hard-wrap") &&
          current.parentElement?.matches(".row-fluid.content-container") === true;
        const retiredTokens = isAuthenticatedHomePageWrapOuter
          ? ["page-wrap-outer"]
          : isAuthenticatedHomePageWrap
            ? ["page-wrap"]
            : isAuthenticatedHomeIntroGuide
              ? ["site-guide-outer"]
              : isAuthenticatedHomeIntroGuideTable
                ? ["welcome-table", "borderless"]
                : isAuthenticatedHomeIntroGuideToggle
                  ? ["guide-toggle"]
                  : isAuthenticatedHomeContentPage
                    ? ["page", "on-fold-intro"]
                    : isAuthenticatedHomeContentGrid
                      ? ["row-fluid"]
                      : isAuthenticatedHomeMainStream
                        ? ["span8"]
                        : isAuthenticatedHomeSeriesTabs
                          ? ["nav", "nav-tabs"]
                          : isAuthenticatedHomeActiveSeriesTab
                            ? ["active"]
                            : isAuthenticatedHomeNotificationList
                              ? ["notification-wrap", "unstyled"]
                              : isAuthenticatedHomeNotificationEmpty
                                ? ["warning-none"]
                                : isAuthenticatedHomeIndexRail
                                  ? ["span4", "index-menu", "right-menu", "span-hard-wrap"]
                                  : isSiteLayoutFooterOuter
                                    ? ["page-footer-outer"]
                                    : isSiteLayoutFooterInner
                                      ? ["page-footer"]
                                      : isSiteLayoutFooterProvider
                                        ? ["provider"]
                                        : isSiteLayoutHeader &&
                                            current.classList.contains("project-header")
                                          ? ["project-header"]
                                          : isSiteLayoutHeader
                                            ? ["gnb-outer"]
                                            : name === "class" &&
                                                current.classList.contains("gnb-inner") &&
                                                current.matches(
                                                  "header.gnb-outer > div.gnb-inner",
                                                ) &&
                                                current.querySelector(
                                                  'form[name="gnb-search-form"]',
                                                ) !== null
                                              ? ["gnb-inner"]
                                              : name === "class" &&
                                                  current.classList.contains("gnb-nav") &&
                                                  current.matches(
                                                    "header.gnb-outer > .gnb-inner > ul.gnb-nav",
                                                  ) &&
                                                  current.querySelector(
                                                    'form[name="gnb-search-form"]',
                                                  ) !== null
                                                ? ["gnb-nav"]
                                                : [];
        if (retiredTokens.length > 0) {
          const originalValue = current.getAttribute(name) ?? "";
          current.setAttribute(
            name,
            originalValue
              .split(/\s+/u)
              .filter((token) => !retiredTokens.includes(token))
              .join(" "),
          );
          try {
            return normalizeAttribute(current, name);
          } finally {
            current.setAttribute(name, originalValue);
          }
        }
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter((value, index, values) => value && values.indexOf(value) === index)
            .filter(
              (value) =>
                !(isAuthenticatedHomeIntroGuideCta && ["ybtn", "ybtn-success"].includes(value)),
            )
            .filter((value) => !value.startsWith("x") && !value.includes("-home-route-screen__"))
            .filter(
              (value) =>
                value !== "admin-logged-in-affix" &&
                !(
                  value === "small-font" && current.parentElement?.matches(".admin-logged-in-affix")
                ),
            )
            .filter(
              (value) =>
                !(
                  (["row-fluid", "user-menu-wrap"].includes(value) &&
                    current.matches(
                      '.row-fluid.user-menu-wrap, [data-stylex-owner="authenticated-sidenav-account-actions"]',
                    )) ||
                  (["user-menu", "logout", "label"].includes(value) &&
                    current.tagName.toLowerCase() === "span" &&
                    current.closest(
                      '.row-fluid.user-menu-wrap, [data-stylex-owner="authenticated-sidenav-account-actions"]',
                    ))
                ),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
      }
    },
    { markup: html },
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
